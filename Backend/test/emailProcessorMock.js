const classifyWithRules = require('../server').classifyWithRules;
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const crypto = require('crypto');

const prisma = new PrismaClient();
const redis = new Redis();

const mockEmails = [
  {
    subject: '🔥 Urgent: Server Down',
    from: 'alerts@monitoring.com',
    snippet: 'The production server is down since 2:30 AM.',
  },
  {
    subject: 'Meeting Reminder',
    from: 'manager@company.com',
    snippet: 'Reminder for the 10 AM sync-up meeting.',
  },
  {
    subject: '50% OFF on your next purchase!',
    from: 'marketing@ecommerce.com',
    snippet: 'Limited-time offer just for you.',
  },
  {
    subject: 'Welcome to our service!',
    from: 'noreply@startup.io',
    snippet: 'Thanks for signing up. Here’s what to do next...',
  },
  {
    subject: 'Re: Project update',
    from: 'colleague@company.com',
    snippet: 'I’ve updated the docs as discussed.',
  },
];

async function simulateEmailProcessing(userEmail) {
  const token = crypto.randomUUID();
  const emailsToInsert = [];

  for (const msg of mockEmails) {
    const priority = await classifyWithRules(
      msg.subject,
      msg.snippet,
      msg.from,
      userEmail
    );

    emailsToInsert.push({
      subject: msg.subject,
      snippet: msg.snippet,
      from: msg.from,
      messageId: crypto.randomUUID().slice(0, 8),
      priority,
    });
  }

  await prisma.session.create({
    data: {
      token,
      userEmail, // ✅ Add this missing required field
      emails: {
        createMany: { data: emailsToInsert },
      },
    },
  });

  await redis.set(`session:${token}`, JSON.stringify(emailsToInsert), 'EX', 300);

  return token;
}

module.exports = { simulateEmailProcessing };
