const { BrowserWindow, session } = require('electron');
const { google } = require('googleapis');
const fetch = require('node-fetch');

// Configurações do Google OAuth
const GOOGLE_CLIENT_ID = '';
const GOOGLE_CLIENT_SECRET = '';
const REDIRECT_URI = 'http://localhost';
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

const LINKEDIN_CLIENT_ID = '';
const LINKEDIN_CLIENT_SECRET = '';
const LINKEDIN_REDIRECT_URI = 'http://localhost/callback';
const LINKEDIN_SCOPES = 'r_liteprofile r_emailaddress';

// Função para criar uma janela de autenticação
function createAuthWindow(url, width = 500, height = 600) {
  const authWindow = new BrowserWindow({
    width,
    height,
    webPreferences: { nodeIntegration: false }
  });
  authWindow.loadURL(url);
  return authWindow;
}

// Função de login com o Google
async function googleLogin() {
  const googleOauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );

  return new Promise((resolve, reject) => {
    const authUrl = googleOauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GOOGLE_SCOPES,
    });

    const authWindow = createAuthWindow(authUrl);

    const filter = { urls: ['http://localhost/*'] };

    session.defaultSession.webRequest.onBeforeRequest(filter, async (details) => {
      const urlParams = new URL(details.url).searchParams;
      const code = urlParams.get('code');

      if (code) {
        try {
          const { tokens } = await googleOauth2Client.getToken(code);
          googleOauth2Client.setCredentials(tokens);

          const oauth2 = google.oauth2({ version: 'v2', auth: googleOauth2Client });
          const userInfo = await oauth2.userinfo.get();

          resolve({
            provider: "google",
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

// Função para login com o LinkedIn
async function linkedinLogin() {
  const linkedinAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(LINKEDIN_REDIRECT_URI)}&scope=${encodeURIComponent(LINKEDIN_SCOPES)}`;

  return new Promise((resolve, reject) => {
    const authWindow = createAuthWindow(linkedinAuthUrl, 600, 700);

    const filter = { urls: ['http://localhost/callback*'] };

    session.defaultSession.webRequest.onBeforeRequest(filter, async (details) => {
      const urlParams = new URL(details.url).searchParams;
      const code = urlParams.get("code");

      if (code) {
        try {
          const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "authorization_code",
              code,
              redirect_uri: LINKEDIN_REDIRECT_URI,
              client_id: LINKEDIN_CLIENT_ID,
              client_secret: LINKEDIN_CLIENT_SECRET
            })
          });

          const tokenData = await tokenResponse.json();
          resolve(tokenData);
        } catch (error) {
          reject(error);
        } finally {
          authWindow.close();
        }
      }
    });
  });
}

module.exports = { googleLogin, linkedinLogin };
