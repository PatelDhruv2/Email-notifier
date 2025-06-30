const { google } = require('googleapis');

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

const getGmail = (auth) => {
  return google.gmail({ version: 'v1', auth });
};

module.exports = { oAuth2Client, getGmail };
