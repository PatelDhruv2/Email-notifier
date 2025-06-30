const { Worker } = require('bullmq');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const redis = require('../redis'); // ✅ fixed filename to match previous `redis.js`
const { oAuth2Client, getGmail } = require('../oauth2');
const classifyPriority = require('../Classify');
const IORedis = require('ioredis');

dotenv.config();

const prisma = new PrismaClient();

// ✅ Redis connection for BullMQ (Upstash with TLS)
const connection = new IORedis(process.env.REDIS_URL, {
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  maxRetriesPerRequest: null,
  connectTimeout: 10000,
});

// ✅ Gmail message cache (5 min)
async function getCachedEmail(userId, messageId, gmail) {
  const cacheKey = `gmail:${userId}:${messageId}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    console.log(`✅ Redis Cache Hit for message: ${messageId}`);
    return JSON.parse(cached);
  }

  const full = await gmail.users.messages.get({ userId, id: messageId });
  await redis.set(cacheKey, JSON.stringify(full.data), 'EX', 300);
  console.log(`📨 Fetched and cached message: ${messageId}`);
  return full.data;
}

// ✅ Priority classification using custom rules
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

// ✅ BullMQ worker for processing Gmail jobs
const worker = new Worker(
  'email-queue', // match queue name from `emailQueue.js`
  async (job) => {
    try {
      console.log('📥 Job received:', job.id);

      const { tokens, userEmail, token } = job.data;
      oAuth2Client.setCredentials(tokens);
      const gmail = getGmail(oAuth2Client);

      const messagesList = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 50,
        labelIds: ['INBOX'],
      });

      if (!messagesList.data.messages) {
        console.log('📭 No inbox messages found.');
        return;
      }

      const emails = await Promise.all(
        messagesList.data.messages.map(async (msg) => {
          const full = await getCachedEmail('me', msg.id, gmail);
          const headers = full.payload.headers;
          const subject = headers.find((h) => h.name === 'Subject')?.value || '';
          const from = headers.find((h) => h.name === 'From')?.value || '';
          const snippet = full.snippet;
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

      console.log(`✅ Job ${job.id} completed for ${userEmail}`);
    } catch (err) {
      console.error(`❌ Job ${job.id} failed:`, err);
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

console.log('🚀 Email Worker is running...');
