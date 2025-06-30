const IORedis = require('ioredis');
require('dotenv').config();

const redis = new IORedis(process.env.REDIS_URL, {
  tls: {}, // <== REQUIRED FOR RAILWAY
  connectTimeout: 10000,
});

redis.on('connect', () => {
  console.log('✅ Connected to Redis');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

module.exports = redis;
