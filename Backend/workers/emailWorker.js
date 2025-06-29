const { Worker } = require('bullmq');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const redis = require('../redisClient');  // ✅ Import your central Redis client
const { oAuth2Client, getGmail } = require('../oauth2');
const classifyPriority = require('../Classify');
const IORedis = require('ioredis');

dotenv.config();

const prisma = new PrismaClient();

// BullMQ requires a separate connection for queue
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
  maxRetriesPerRequest: null,
});

// ✅ Redis cache wrapper for Gmail API fetch
async function getCachedEmail(userId, messageId, gmail) {
  const cacheKey = `gmail:${userId}:${messageId}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    console.log(`✅ Redis Cache Hit for message: ${messageId}`);
    return JSON.parse(cached);
  }

  const full = await gmail.users.messages.get({ userId, id: messageId });
  await redis.set(cacheKey, JSON.stringify(full.data), 'EX', 300); // Cache for 5 mins
  console.log(`✅ Redis Cache Miss for message: ${messageId}`);
  return full.data;
}

// ✅ Custom rule-based classifier
async function classifyWithRules(subject, snippet, from, userEmail) {
  const rules = await prisma.priorityRule.findMany({ where: { userEmail } });

  for (const rule of rules) {
    const keyword = rule.keyword.toLowerCase();
    if (
      (rule.matchType === 'sender' && from.toLowerCase().includes(keyword)) ||
      (rule.matchType === 'keyword' &&
        (subject.toLowerCase().includes(keyword) || snippet.toLowerCase().includes(keyword)))
    ) {
      return rule.priority.toLowerCase();
    }
  }

  return classifyPriority(subject, snippet);
}

// ✅ BullMQ Worker
const worker = new Worker(
  'email-processing',
  async (job) => {
    try {
      console.log('📥 Processing Job:', job.id);

      const { tokens, userEmail, token } = job.data;
      oAuth2Client.setCredentials(tokens);
      const gmail = getGmail(oAuth2Client);

      const messagesList = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 50,
        labelIds: ['INBOX'],
      });

      if (!messagesList.data.messages) {
        console.log('📭 No messages found.');
        return;
      }

      const emails = await Promise.all(
        messagesList.data.messages.map(async (msg) => {
          const full = await getCachedEmail('me', msg.id, gmail);
          const snippet = full.snippet;
          const headers = full.payload.headers;
          const subject = headers.find((h) => h.name === 'Subject')?.value || '';
          const from = headers.find((h) => h.name === 'From')?.value || '';
          const messageId = full.id;

          const priority = await classifyWithRules(subject, snippet, from, userEmail);

          return { subject, from, snippet, priority, messageId };
        })
      );

      const session = await prisma.session.create({
        data: {
          token,
          userEmail,
          createdAt: new Date(),
        },
      });

      await prisma.email.createMany({
        data: emails.map((email) => ({
          subject: email.subject,
          from: email.from,
          snippet: email.snippet,
          priority: email.priority,
          messageId: email.messageId,
          sessionId: session.id,
        })),
      });

      console.log(`✅ Job ${job.id} done for user ${userEmail}`);
    } catch (err) {
      console.error(`❌ Worker Job ${job.id} Failed:`, err);
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

console.log('🚀 Email Worker Started...');
