const express = require('express');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const cors = require('cors');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { oAuth2Client, getGmail } = require('./oauth2');
const classifyPriority = require('./Classify');
const emailQueue = require('./queues/emailQueue');

dotenv.config();
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ✅ Constants
const redirectUri = process.env.REDIRECT_URI;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
const validMatchTypes = ['sender', 'keyword'];
const validPriorities = ['low', 'medium', 'high'];

console.log(`🔗 Google OAuth Callback URI: ${redirectUri}`);

// 1️⃣ Google OAuth Flow
app.get('/auth/google', (req, res) => {
  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    redirect_uri: redirectUri,
  });
  res.redirect(url);
});

// 2️⃣ OAuth Callback
app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const { tokens } = await oAuth2Client.getToken({ code, redirect_uri: redirectUri });
    oAuth2Client.setCredentials(tokens);

    const gmail = getGmail(oAuth2Client);
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const userEmail = profile.data.emailAddress;
    const token = crypto.randomUUID();

    // Add to processing queue
    await emailQueue.add('email-queue', {
      tokens,
      userEmail,
      token,
    });

    // Redirect to frontend dashboard with token
    res.redirect(`${frontendUrl}/dashboard?token=${token}`);
  } catch (err) {
    console.error('❌ OAuth Callback Error:', err);
    res.status(500).json({ error: 'Google Auth failed' });
  }
});

// 3️⃣ Get Emails by Token
app.get('/emails/:token', async (req, res) => {
  try {
    const session = await prisma.session.findUnique({
      where: { token: req.params.token },
      include: { emails: true },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ emails: session.emails });
  } catch (err) {
    console.error('❌ Fetch Email Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4️⃣ Add Custom Rule
app.post('/rules', async (req, res) => {
  try {
    const { userEmail, keyword, matchType, priority } = req.body;

    if (!userEmail || !keyword || !matchType || !priority) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (
      !validMatchTypes.includes(matchType.toLowerCase()) ||
      !validPriorities.includes(priority.toLowerCase())
    ) {
      return res.status(400).json({ error: 'Invalid matchType or priority' });
    }

    const rule = await prisma.priorityRule.create({
      data: {
        userEmail,
        keyword,
        matchType: matchType.toLowerCase(),
        priority: priority.toLowerCase(),
      },
    });

    res.json({ success: true, rule });
  } catch (err) {
    console.error('❌ Add Rule Error:', err);
    res.status(500).json({ error: 'Failed to add rule' });
  }
});

// 5️⃣ Job Status Check
app.get('/status/:token', async (req, res) => {
  try {
    const session = await prisma.session.findUnique({
      where: { token: req.params.token },
    });

    if (!session) {
      return res.json({ status: 'processing' });
    }

    return res.json({ status: 'done' });
  } catch (err) {
    console.error('❌ Status Check Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 6️⃣ Debug Route: Show Recent Sessions
app.get('/debug/sessions', async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { emails: true },
    });

    res.json({ sessions });
  } catch (err) {
    console.error('❌ Debug Sessions Error:', err);
    res.status(500).json({ error: 'Failed to fetch debug data' });
  }
});

// 7️⃣ Root Health Check
app.get('/', (req, res) => {
  res.send('✅ Email Notifier Backend is running on Railway');
});

// 🧠 Classifier with Rules
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

// 🚦 Shutdown Handler
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => console.log(`🚀 Server is running on port ${PORT}`));
