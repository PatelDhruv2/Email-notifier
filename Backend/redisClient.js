const IORedis = require('ioredis');
require('dotenv').config();

const redis = new IORedis(process.env.REDIS_URL, {
  tls: {}, // Enables TLS for rediss://
  connectTimeout: 10000,
  maxRetriesPerRequest: null,
});

redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err) => console.error('❌ Redis connection error:', err));

module.exports = redis;
