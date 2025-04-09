const { ipcRenderer } = require("electron");
const axios = require("axios");

async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const { data } = await axios.post('https://spaceapp-digital-api.onrender.com/login', {
      email,
      password
    });

    localStorage.setItem('token', data.token);

    const payload = parseJwt(data.token);

    if (payload.uuid != null) {
      localStorage.setItem('userUuid', payload.uuid);
    }
    ipcRenderer.send('login-success', data.token,data.userUuid );
  } catch (error) {
    console.error('Login error:', error);
    alert('Invalid email or password');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginButton').addEventListener('click', login);
  document.getElementById('googleLogin').addEventListener('click', () => {
    ipcRenderer.send('start-google-login');
  });

  ipcRenderer.on('google-login-failed', (event, message) => {
    const errorMsg = document.getElementById('errorMessage');
    errorMsg.textContent = 'Falha ao fazer login com Google: ' + message;
    errorMsg.style.display = 'block';
  });
});


function parseJwt(token) {
  try {
    const base64Payload = token.split('.')[1]; 
    const payload = atob(base64Payload);
    return JSON.parse(payload); 
  } catch (e) {
    console.error('Failed to parse JWT', e);
    return null;
  }
}