// oauth2.js
const { google } = require('googleapis');
require('dotenv').config();

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  'http://localhost:5000/auth/google/callback'
);

function getGmail(auth) {
  return google.gmail({ version: 'v1', auth });
}

module.exports = { oAuth2Client, getGmail };
