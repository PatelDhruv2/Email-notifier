// redisClient.js
const { createClient } = require('redis');

const client = createClient({
  socket: {
    host: '127.0.0.1',
    port: 6379,
  },
  // 👇 Required for BullMQ
  maxRetriesPerRequest: null,
});

client.on('error', (err) => console.error('Redis Client Error', err));

client.connect();

module.exports = client;
