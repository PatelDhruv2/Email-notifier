const express = require('express');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const cors = require('cors');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { oAuth2Client, getGmail } = require('./oauth2');
const classifyPriority = require('./Classify');

dotenv.config();
const prisma = new PrismaClient();
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// 1️⃣ Google OAuth flow
app.get('/auth/google', (req, res) => {
  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
  });
  res.redirect(url);
});

// 2️⃣ Google OAuth callback
app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    const gmail = getGmail(oAuth2Client);
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const userEmail = profile.data.emailAddress;

    const messages = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 50,
      labelIds: ['INBOX'],
    });

    const emails = [];

    for (const msg of messages.data.messages) {
      const full = await gmail.users.messages.get({ userId: 'me', id: msg.id });
      const snippet = full.data.snippet;
      const headers = full.data.payload.headers;
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const from = headers.find(h => h.name === 'From')?.value || '';
      const messageId = full.data.id; // ✅ extract Gmail message ID

      const priority = await classifyWithRules(subject, snippet, from, userEmail);

      emails.push({
        subject,
        from,
        snippet,
        priority,
        messageId, // ✅ include messageId for Prisma
      });
    }

    const token = crypto.randomUUID();

    await prisma.session.create({
      data: {
        token,
        userEmail,
        createdAt: new Date(),
        emails: {
          create: emails.map(email => ({
            subject: email.subject,
            from: email.from,
            snippet: email.snippet,
            priority: email.priority,
            messageId: email.messageId, // ✅ required by Prisma schema
          }))
        }
      }
    });

    res.redirect(`http://localhost:3000/dashboard?token=${token}`);
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
    if (!session) return res.status(404).json({ error: 'Session not found' });
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

    const rule = await prisma.priorityRule.create({
      data: {
        userEmail,
        keyword,
        matchType,
        priority,
      },
    });

    res.json({ success: true, rule });
  } catch (err) {
    console.error('Add Rule Error:', err);
    res.status(500).json({ error: 'Failed to add rule' });
  }
});

// 🔍 Custom classifier using rules
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

  // fallback to default ML classifier
  return classifyPriority(subject, snippet);
}

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
