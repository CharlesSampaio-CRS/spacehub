const { ipcRenderer } = require("electron");
const axios = require("axios");
const Swal = require("sweetalert2");

async function login() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!email || !password) {
    await Swal.fire({
      icon: 'warning',
      title: 'Campos obrigatórios',
      text: 'Por favor, preencha e-mail e senha.',
      confirmButtonColor: '#f59e0b',
      confirmButtonText: 'OK'
    });
    return;
  }

  try {
    const { data } = await axios.post('https://spaceapp-digital-api.onrender.com/login', {
      email,
      password
    });
    ipcRenderer.send('login-success', data.token);
  } catch (error) {
    console.error('Login error:', error);
    if (error.response && error.response.status === 401) {
      await Swal.fire({
        icon: 'error',
        title: 'Erro de Login',
        text: 'E-mail ou senha inválidos.',
        confirmButtonColor: '#d33',
        confirmButtonText: 'OK'
      });
    } else {
      await Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Falha ao tentar logar. Verifique sua conexão e tente novamente.',
        confirmButtonColor: '#d33',
        confirmButtonText: 'OK'
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginButton').addEventListener('click', login);

  document.getElementById('googleLogin').addEventListener('click', () => {
    ipcRenderer.send('start-google-login');
  });

  ipcRenderer.on('google-login-failed', async (event, message) => {
    await Swal.fire({
      icon: 'error',
      title: 'Falha no Google Login',
      text: 'Não foi possível fazer login com Google: ' + message,
      confirmButtonColor: '#d33',
      confirmButtonText: 'OK'
    });
  });
});

