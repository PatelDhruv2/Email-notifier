const { Queue } = require('bullmq');
const IORedis = require('ioredis');
require('dotenv').config();

// ✅ Use REDIS_URL cleanly (e.g., from Railway)
const connection = new IORedis(process.env.REDIS_URL, {
  tls: process.env.REDIS_URL?.startsWith('rediss://') ? {} : undefined, // Enable TLS only if using rediss://
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
