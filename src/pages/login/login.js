// const { ipcRenderer } = require("electron");
// const axios = require("axios");
// const Swal = require("sweetalert2");

async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const rememberMe = document.getElementById('rememberMe').checked;

  if (!email || !password) {
    Swal.fire({
      icon: 'error',
      title: 'Erro',
      text: 'Por favor, preencha todos os campos.'
    });
    return;
  }

  try {
    const data = await window.electronAPI.login({ email, password });

    if (rememberMe) {
      localStorage.setItem('rememberedEmail', email);
      localStorage.setItem('rememberedPassword', password);
    } else {
      localStorage.removeItem('rememberedEmail');
      localStorage.removeItem('rememberedPassword');
    }

    window.electronAPI.send('login-success', data.token);
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Erro',
      text: error.response?.data?.message || 'Falha ao tentar logar. Verifique sua conexão e tente novamente.'
    });
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

const setupDarkMode = () => {
  const toggle = document.getElementById("dark-mode-toggle");
  const toggleIcon = document.getElementById("dark-mode-icon");
  if (!toggle || !toggleIcon) return;

  // Verificar o estado atual do modo escuro no store do Electron
  window.electronAPI.getDarkMode().then(isDarkMode => {
    toggle.checked = isDarkMode;
    document.documentElement.classList.toggle("dark-mode", isDarkMode);
    document.body.classList.toggle("dark-mode", isDarkMode);
    localStorage.setItem('darkMode', isDarkMode);
    
    // Definir o ícone inicial
    toggleIcon.innerHTML = isDarkMode ? '🌙' : '☀️';
  });

  // Adicionar listener para mudanças no modo escuro
  window.electronAPI.onDarkModeChanged((isDark) => {
    document.documentElement.classList.toggle("dark-mode", isDark);
    document.body.classList.toggle("dark-mode", isDark);
    toggle.checked = isDark;
    toggleIcon.innerHTML = isDark ? '🌙' : '☀️';
    localStorage.setItem('darkMode', isDark);
  });

  toggle.addEventListener("change", () => {
    const isDark = toggle.checked;
    document.documentElement.classList.toggle("dark-mode", isDark);
    document.body.classList.toggle("dark-mode", isDark);
    localStorage.setItem('darkMode', isDark);
    window.electronAPI.sendDarkModeChanged(isDark);
    
    // Atualizar o ícone
    toggleIcon.innerHTML = isDark ? '🌙' : '☀️';
  });
};

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
    window.electronAPI.send('start-google-login');
  });

  // Eventos de resposta de login com Google
  window.electronAPI.on('google-login-success', (event, tokens) => {
    const token = tokens.id_token || tokens.access_token;
    localStorage.setItem('token', token);
    window.electronAPI.send('login-success', token);
  });

  window.electronAPI.on('google-login-failed', async (event, message) => {
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
      window.electronAPI.send('show-register');
    } catch (e) {
      console.error('Erro ao abrir tela de registro:', e);
    }
  });

  setupDarkMode();
});
