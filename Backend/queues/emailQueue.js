const { Queue } = require('bullmq');
const IORedis = require('ioredis');
require('dotenv').config();

// ✅ Use REDIS_URL cleanly
const connection = new IORedis(process.env.REDIS_URL, {
  // Optional: enable TLS if REDIS_URL starts with rediss://
  tls: process.env.REDIS_URL?.startsWith('rediss://') ? {} : undefined,
  maxRetriesPerRequest: null,
  connectTimeout: 10000,
});

const emailQueue = new Queue('email-processing', {
  connection,
  defaultJobOptions: {
    removeOnComplete: true,
    attempts: 3,
  },
});

module.exports = emailQueue;
