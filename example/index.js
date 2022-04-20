const { Storage } = require('@google-cloud/storage');
const Redis = require('ioredis');
const CacheManager = require('cache-manager');
const GcpStore = require('..');
const Bucket = new Storage().bucket('<bucket-name>');
const RedisClient = new Redis();

const gcpStore = CacheManager.caching({
  store: GcpStore,
  bucket: Bucket,
  redisClient: RedisClient,
  path: 'GcpCache',
  ttl: 60,
});

(async () => {
  await gcpStore.set('asa-test-cache', { data: 'test' });

  console.log(await gcpStore.get('asa-test-cache'));

  await gcpStore.del('asa-test-cache');
  RedisClient.disconnect();
})();
