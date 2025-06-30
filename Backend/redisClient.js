const IORedis = require('ioredis');
require('dotenv').config();

const redis = new IORedis({
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
  maxRetriesPerRequest: null,
  connectTimeout: 10000, // Optional: 10 seconds timeout
});

redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err) => console.error('❌ Redis connection error:', err));

module.exports = redis;
