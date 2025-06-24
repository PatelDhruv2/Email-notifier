const { Queue } = require('bullmq');
const Redis = require('ioredis');

const redis = new Redis({
  host: '127.0.0.1',
  port: 6379,
  maxRetriesPerRequest: null, // ✅ required for BullMQ
});

const classifyQueue = new Queue('process-single-email', {
  connection: redis,
});

module.exports = classifyQueue;
