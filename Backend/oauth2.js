const { google } = require('googleapis');
require('dotenv').config();

const redirectUri =
  process.env.BACKEND_URL + '/auth/google/callback' || 'http://localhost:5000/auth/google/callback';

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  redirectUri
);

function getGmail(auth) {
  return google.gmail({ version: 'v1', auth });
}

module.exports = { oAuth2Client, getGmail };
