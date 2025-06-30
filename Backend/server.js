const express = require('express');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const cors = require('cors');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { oAuth2Client, getGmail } = require('./oauth2');
const classifyPriority = require('./Classify');
const emailQueue = require('./queues/emailQueue.js');

dotenv.config();
const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ✅ Fallback for redirect URI
const redirectUri = process.env.REDIRECT_URI;

// 🔐 Allowed values
const validMatchTypes = ['sender', 'keyword'];
const validPriorities = ['low', 'medium', 'high'];

// 1️⃣ Google OAuth flow
app.get('/auth/google', (req, res) => {
  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    redirect_uri: redirectUri,
  });
  res.redirect(url);
});
console.log(`🔗 Google OAuth URL: ${redirectUri}`);

// 2️⃣ Google OAuth callback
app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const { tokens } = await oAuth2Client.getToken({
      code,
      redirect_uri: redirectUri,
    });
    oAuth2Client.setCredentials(tokens);

    const gmail = getGmail(oAuth2Client);
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const userEmail = profile.data.emailAddress;

    const token = crypto.randomUUID();

    await emailQueue.add('email-queue', {
      tokens,
      userEmail,
      token,
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/dashboard?token=${token}`);
  } catch (err) {
    console.error('OAuth Callback Error:', err);
    res.status(500).json({ error: 'Google Auth failed' });
  }
});

// 3️⃣ Get emails by token
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
    console.error('Fetch Email Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4️⃣ Add custom priority rule
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
    console.error('Add Rule Error:', err);
    res.status(500).json({ error: 'Failed to add rule' });
  }
});

// ✅ Job Status Check
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
    console.error('Status Check Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ Root health check
app.get('/', (req, res) => {
  res.send('Hello World from Railway deployed backend!');
});

// 🔍 Classifier with custom rules
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

// 🛑 Graceful shutdown for Prisma
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
