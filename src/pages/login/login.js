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

// Atualiza o estado do botão de login com base nos campos
function updateButtonState() {
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginButton = document.getElementById('loginButton');
  
  const emailFilled = emailInput.value.trim() !== '';
  const passwordFilled = passwordInput.value.trim() !== '';
  
  loginButton.disabled = !(emailFilled && passwordFilled);
}

// Carregar dados do LocalStorage ao iniciar
window.addEventListener('DOMContentLoaded', () => {
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const rememberMe = document.getElementById('rememberMe');

  const savedEmail = localStorage.getItem('savedEmail');
  const savedPassword = localStorage.getItem('savedPassword');
  const remember = localStorage.getItem('rememberMe') === 'true';

  if (remember && savedEmail && savedPassword) {
    emailInput.value = savedEmail;
    passwordInput.value = savedPassword;
    rememberMe.checked = true;
    updateButtonState();
  }

  // Eventos para inputs
  emailInput.addEventListener('input', updateButtonState);
  passwordInput.addEventListener('input', updateButtonState);

  // Evento ao clicar em "Entrar"
  document.getElementById('loginButton').addEventListener('click', () => {
    const rememberMe = document.getElementById('rememberMe');

    if (rememberMe.checked) {
      localStorage.setItem('savedEmail', emailInput.value);
      localStorage.setItem('savedPassword', passwordInput.value);
      localStorage.setItem('rememberMe', 'true');
    } else {
      localStorage.removeItem('savedEmail');
      localStorage.removeItem('savedPassword');
      localStorage.setItem('rememberMe', 'false');
    }

    login();
  });

  // Ação para login com Google
  document.getElementById('googleLogin')?.addEventListener('click', () => {
    ipcRenderer.send('start-google-login');
  });

  // Eventos de resposta de login com Google
  ipcRenderer.on('google-login-success', (event, tokens) => {
    const token = tokens.id_token || tokens.access_token;
    localStorage.setItem('token', token);
    ipcRenderer.send('login-success', token);
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

  // Evento para abrir tela de registro
  document.getElementById('registerLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    try {
      window.electronAPI?.openRegister?.();
      ipcRenderer.send('show-register');
    } catch (e) {
      console.error('Erro ao abrir tela de registro:', e);
    }
  });
});
