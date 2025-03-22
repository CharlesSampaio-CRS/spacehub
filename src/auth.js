
const { BrowserWindow, session } = require('electron');
const { google } = require('googleapis');

const CLIENT_ID = '';
const CLIENT_SECRET = '';
const REDIRECT_URI = 'http://localhost';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = [
    'https://www.googleapis.com/auth/userinfo.email', // Para acessar o e-mail
    'https://www.googleapis.com/auth/userinfo.profile', // Para acessar o nome e outras informações do perfil
  ];

async function googleLogin() {
    return new Promise((resolve, reject) => {
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
      });
  
      let authWindow = new BrowserWindow({
        width: 500,
        height: 600,
        webPreferences: { nodeIntegration: false }
      });
  
      authWindow.loadURL(authUrl);
  
      const filter = { urls: ['http://localhost/*'] };
  
      session.defaultSession.webRequest.onBeforeRequest(filter, async (details) => {
        const urlParams = new URL(details.url).searchParams;
        const code = urlParams.get('code');
  
        if (code) {
          try {
            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);
  
            const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
            const userInfo = await oauth2.userinfo.get();
  
            resolve({
              tokens,
              email: userInfo.data.email,
              name: userInfo.data.name,
            });
          } catch (error) {
            reject(error);
          } finally {
            authWindow.close();
          }
        }
      });
    });
  }
  
  module.exports = { googleLogin };