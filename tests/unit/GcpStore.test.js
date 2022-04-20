const { GcpStore, create } = require('../../src/GcpStore');

describe('Test GCPStore', () => {
  // beforeEach(() => {
  //   chai.use(chaiAsPromised);
  //   chai.should();
  // });

  it('Given correct params should be able to create GCPStore Instance', async () => {
    const redis = mockRedis();
    const { bucket } = mockBucket();
    const gcpStoreInstance = create({
      oath: 'path',
      ttl: 60,
      redisClient: redis,
      bucket: bucket,
    });
    expect(gcpStoreInstance).toBeInstanceOf(GcpStore);
  });

  it('Given a key should create key in redis and gcp storage', async () => {
    const redis = mockRedis();
    const { bucket, bucketFileResponse } = mockBucket();

    const gcpStoreInstance = create({
      path: 'path',
      ttl: 60,
      redisClient: redis,
      bucket: bucket,
    });

    gcpStoreInstance.set('test', { data: 'data' }, null, (err, result) => {
      expect(result).toBe(true);
      expect(err).toBe(null);
      expect(redis.set).toHaveBeenCalledTimes(1);
      expect(redis.expire).toHaveBeenCalledTimes(1);
      expect(bucketFileResponse.save).toHaveBeenCalledTimes(1);
    });
  });

  it('Given a key should return data for the key if its not expired in redis', async () => {
    const redis = mockRedis();

    const { bucket, bucketFileResponse } = mockBucket();

    const gcpStoreInstance = create({
      path: 'path',
      ttl: 60,
      redisClient: redis,
      bucket: bucket,
    });

    const result = await gcpStoreInstance.get('test');
    expect(result).toBe(true);
    expect(redis.ttl).toHaveBeenCalledTimes(1);
    expect(bucket.file).toHaveBeenCalledTimes(1);
    expect(bucketFileResponse.download).toHaveBeenCalledTimes(1);
  });

  it('Given a key should delete data for the key if its expired in redis', async () => {
    const redis = mockRedis();
    redis.ttl = jest.fn().mockImplementation(() => Promise.resolve(0));

    const { bucket, bucketFileResponse } = mockBucket();

    const gcpStoreInstance = create({
      path: 'path',
      ttl: 60,
      redisClient: redis,
      bucket: bucket,
    });

    const result = await gcpStoreInstance.get('test');

    expect(result).toBe(null);
    expect(redis.ttl).toHaveBeenCalledTimes(1);
    expect(redis.del).toHaveBeenCalledTimes(1);
    expect(bucket.file).toHaveBeenCalledTimes(1);
    expect(bucketFileResponse.delete).toHaveBeenCalledTimes(1);
  });

  it('If keys function is called should return all the keys', async () => {
    const redis = mockRedis();
    const { bucket } = mockBucket();

    const gcpStoreInstance = create({
      path: 'path',
      ttl: 60,
      redisClient: redis,
      bucket: bucket,
    });
    await gcpStoreInstance.keys();
    expect(redis.keys).toHaveBeenCalledTimes(1);
  });
});

function mockBucket() {
  const bucketFileResponse = {
    save: jest.fn().mockImplementation(() => Promise.resolve(true)),
    download: jest.fn().mockImplementation(() => Promise.resolve(true)),
    delete: jest.fn().mockImplementation(() => Promise.resolve(true)),
    exists: jest.fn().mockImplementation(() => Promise.resolve([true])),
  };
  const bucket = {
    file: jest.fn().mockImplementation(() => {
      return bucketFileResponse;
    }),
  };
  return { bucket, bucketFileResponse };
}

function mockRedis() {
  return {
    set: jest.fn().mockImplementation(() => Promise.resolve(true)),
    expire: jest.fn().mockImplementation(() => Promise.resolve(true)),
    ttl: jest.fn().mockImplementation(() => Promise.resolve(1)),
    del: jest.fn().mockImplementation(() => Promise.resolve(true)),
    keys: jest.fn().mockImplementation(() => Promise.resolve(['k1', 'k2'])),
  };
}
