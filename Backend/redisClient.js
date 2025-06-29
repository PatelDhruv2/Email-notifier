const IORedis = require('ioredis');
require('dotenv').config();

const redis = new IORedis({
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
  maxRetriesPerRequest: null,
});

module.exports = redis;
