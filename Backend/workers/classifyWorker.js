const { Worker } = require('bullmq');
const Redis = require('ioredis');
const { google } = require('googleapis');
const prisma = require('../prismaClient'); // ✅ shared Prisma instance
const { classifyWithRules } = require('../server'); // ✅ your function

const redis = new Redis();

const worker = new Worker(
  'process-single-email',
  async (job) => {
    const { token, userEmail, messageId, accessToken } = job.data;

    // 1️⃣ Set Gmail credentials
    const oAuth2Client = new google.auth.OAuth2();
    oAuth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    // 2️⃣ Fetch email
    const msg = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'metadata',
      metadataHeaders: ['Subject', 'From'],
    });

    const payload = msg.data.payload.headers;
    const subject = payload.find((h) => h.name === 'Subject')?.value || 'No Subject';
    const from = payload.find((h) => h.name === 'From')?.value || 'Unknown';

    // 3️⃣ Fetch snippet
    const full = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });
    const snippet = full.data.snippet || '';

    // 4️⃣ Classify
    const priority = await classifyWithRules(subject, snippet, from, userEmail);

    // 5️⃣ Save to DB
    await prisma.email.create({
      data: {
        token,
        subject,
        snippet,
        from,
        messageId,
        priority,
      },
    });

    // 6️⃣ Count & finalize
    const totalKey = `total:${token}`;
    const doneKey = `completed:${token}`;

    const total = await redis.get(totalKey);
    const completed = await redis.incr(doneKey);

    if (parseInt(completed) === parseInt(total)) {
      const emails = await prisma.email.findMany({ where: { token } });
      await redis.set(`session:${token}`, JSON.stringify(emails), 'EX', 300); // 5 min cache
      await redis.del(totalKey, doneKey);
    }

    return { success: true, priority };
  },
  {
    connection: {
      host: '127.0.0.1',
      port: 6379,
      maxRetriesPerRequest: null,
    },
    concurrency: 5, // ⏩ adjust based on system
  }
);

worker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err);
});
