// redis.js
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL, {
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

module.exports = redis;
