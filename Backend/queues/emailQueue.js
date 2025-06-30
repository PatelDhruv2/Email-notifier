const { Queue } = require('bullmq');

const emailQueue = new Queue('email-queue', {
  connection: {
    url: process.env.REDIS_URL,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined
  }
});

module.exports = emailQueue;
