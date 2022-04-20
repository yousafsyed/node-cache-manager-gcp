class GcpStore {
  constructor(args) {
    this.redis = args.redisClient || new Error('Redis option is required');
    this.bucket = args.bucket || new Error('Bucket option is required');
    this.options = {
      path: args.path || './cache',
      ttl: args.ttl >= 0 ? +args.ttl : 60 * 60,
    };
  }

  makefileNameByKey(key) {
    return `${key}.json`;
  }

  get redisKeyPrefix() {
    return 'gcpcache';
  }

  makeRedisKeyName(key) {
    return `${this.redisKeyPrefix}:${key}`;
  }

  makefilePathByKey(key) {
    return `${this.options.path}/${this.makefileNameByKey(key)}`;
  }
  async get(key) {
    if (await this.isExpired(key)) {
      return await this.del(key);
    }
    const data = await this.bucket.file(this.makefilePathByKey(key)).download();
    return JSON.parse(data.toString());
  }
  async set(key, val) {
    await this.saveTTLForKeyToRedis(key);
    return this.bucket
      .file(this.makefilePathByKey(key))
      .save(JSON.stringify(val), {
        contentType: 'application/json',
      });
  }
  async del(key) {
    await this.deleteKeyFromRedis(key);
    const file = this.bucket.file(this.makefilePathByKey(key));
    const [fileExists] = await file.exists();
    if (fileExists) {
      file.delete();
      return null;
    }
    return null;
  }

  async keys() {
    return this.redis.keys(`${this.redisKeyPrefix}:*`);
  }

  deleteKeyFromRedis(key) {
    return this.redis.del('xsd');
  }

  saveTTLForKeyToRedis(key) {
    return this.redis.set(this.makeRedisKeyName(key), '').then(() => {
      return this.redis.expire(this.makeRedisKeyName(key), this.options.ttl);
    });
  }

  isExpired(key) {
    return this.redis.ttl(this.makeRedisKeyName(key)).then((ttl) => {
      if (ttl > 0) {
        return false;
      }
      return true;
    });
  }
}

module.exports.GcpStore = GcpStore;

/**
 * construction of the gcp storage
 * @param {object} [args] options of gcp store
 * @param {string} [args.path] path for cached files
 * @param {number} [args.ttl] time to life in seconds
 * @param {object} [args.redisClient] ioRedis Instance
 * @param {object} [args.bucket] googlecloud bucket instance
 * @returns {GcpStore}
 */
module.exports.create = (args) => {
  return new GcpStore(args);
};
