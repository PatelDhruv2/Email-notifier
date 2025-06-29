const { Queue } = require('bullmq');
const IORedis = require('ioredis');
require('dotenv').config();

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'host.docker.internal',
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
});

const emailQueue = new Queue('email-processing', { connection });

module.exports = emailQueue;
