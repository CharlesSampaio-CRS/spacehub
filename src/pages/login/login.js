async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const rememberMe = document.getElementById('rememberMe').checked;
  const loginButton = document.getElementById('loginButton');

  if (!email || !password) {
    Swal.fire({
      icon: 'error',
      title: 'Erro',
      text: 'Por favor, preencha todos os campos.'
    });
    return;
  }

  // Obter idioma atual para traduzir o texto do botão
  const currentLanguage = await window.electronAPI.getLanguage();
  const loadingTexts = {
    'pt-BR': 'Entrando...',
    'en-US': 'Signing in...'
  };
  const loadingText = loadingTexts[currentLanguage] || 'Entrando...';

  loginButton.disabled = true;
  const originalText = loginButton.textContent;
  loginButton.textContent = loadingText;
  loginButton.classList.add('loading');

  try {
    const data = await window.electronAPI.login({ email, password });

    if (rememberMe) {
      localStorage.setItem('rememberedEmail', email);
      localStorage.setItem('rememberedPassword', password);
    } else {
      localStorage.removeItem('rememberedEmail');
      localStorage.removeItem('rememberedPassword');
    }

    const token = data.data?.token || data.token;
    
    if (!token) {
      throw new Error('Token não encontrado na resposta do servidor');
    }

    window.electronAPI.send('login-success', token);
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Erro',
      text: error.response?.data?.message || 'Falha ao tentar logar. Verifique sua conexão e tente novamente.'
    });
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = originalText;
    loginButton.classList.remove('loading');
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

const setupLanguage = () => {
  // Verificar o idioma atual no store do Electron
  window.electronAPI.getLanguage().then(language => {
    document.documentElement.lang = language;
    translatePage(language);
  });

  // Adicionar listener para mudanças no idioma
  window.electronAPI.onLanguageChanged((language) => {
    document.documentElement.lang = language;
    translatePage(language);
  });
};

const showError = (message) => {
  const errorElement = document.getElementById('errorMessage');
  errorElement.textContent = message;
  errorElement.style.display = 'block';
};

const validateForm = () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const loginButton = document.getElementById('loginButton');

  // Obter o idioma atual do Electron
  window.electronAPI.getLanguage().then(currentLanguage => {
    const translations = {
      'pt-BR': {
        'Email inválido': 'Email inválido',
        'Senha inválida': 'Senha inválida',
        'Preencha todos os campos': 'Preencha todos os campos',
        'update_available': 'Uma nova versão está disponível para download.',
        'current_version': 'Versão Atual',
        'new_version': 'Nova Versão',
        'latest_version': 'Você está usando a versão mais recente.',
        'update_check_error': 'Não foi possível verificar atualizações no momento.',
        'restart_confirmation': 'O sistema será reiniciado para aplicar a atualização. Deseja continuar?',
        'Atualizar': 'Atualizar',
        'Confirmar': 'Confirmar',
        'OK': 'OK',
        'Erro': 'Erro',
        'Confirmação': 'Confirmação',
        'Cancelar': 'Cancelar'
      },
      'en-US': {
        'Email inválido': 'Invalid email',
        'Senha inválida': 'Invalid password',
        'Preencha todos os campos': 'Please fill in all fields',
        'update_available': 'A new version is available for download.',
        'current_version': 'Current Version',
        'new_version': 'New Version',
        'latest_version': 'You are using the latest version.',
        'update_check_error': 'Unable to check for updates at this time.',
        'restart_confirmation': 'The system will restart to apply the update. Do you want to continue?',
        'Atualizar': 'Update',
        'Confirmar': 'Confirm',
        'OK': 'OK',
        'Erro': 'Error',
        'Confirmação': 'Confirmation',
        'Cancelar': 'Cancel'
      }
    };

    if (!email || !password) {
      showError(translations[currentLanguage]['Preencha todos os campos']);
      loginButton.disabled = true;
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError(translations[currentLanguage]['Email inválido']);
      loginButton.disabled = true;
      return false;
    }

    if (password.length < 6) {
      showError(translations[currentLanguage]['Senha inválida']);
      loginButton.disabled = true;
      return false;
    }

    document.getElementById('errorMessage').style.display = 'none';
    loginButton.disabled = false;
    return true;
  });
};

// Função auxiliar para ativar/desativar loading no botão de login
function setLoginButtonLoading(isLoading, loadingText) {
  const loginButton = document.getElementById('loginButton');
  if (!loginButton) return;
  if (isLoading) {
    loginButton.disabled = true;
    loginButton.dataset.originalText = loginButton.textContent;
    loginButton.textContent = loadingText || 'Entrando...';
    loginButton.classList.add('loading');
  } else {
    loginButton.disabled = false;
    loginButton.textContent = loginButton.dataset.originalText || 'Entrar';
    loginButton.classList.remove('loading');
  }
}

// Carregar dados do LocalStorage ao iniciar
window.addEventListener('DOMContentLoaded', () => {
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const rememberMe = document.getElementById('rememberMe');

  const savedEmail = localStorage.getItem('rememberedEmail');
  const savedPassword = localStorage.getItem('rememberedPassword');
  const remember = localStorage.getItem('rememberLogin') === 'true';

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
      localStorage.setItem('rememberedEmail', emailInput.value);
      localStorage.setItem('rememberedPassword', passwordInput.value);
      localStorage.setItem('rememberLogin', 'true');
    } else {
      localStorage.removeItem('rememberedEmail');
      localStorage.removeItem('rememberedPassword');
      localStorage.setItem('rememberLogin', 'false');
    }

    login();
  });

  // Ação para login com Google
  document.getElementById('googleLogin')?.addEventListener('click', async () => {
    // Obter idioma atual para traduzir o texto do botão
    const currentLanguage = await window.electronAPI.getLanguage();
    const loadingTexts = {
      'pt-BR': 'Entrando...',
      'en-US': 'Signing in...'
    };
    setLoginButtonLoading(true, loadingTexts[currentLanguage] || 'Entrando...');
    window.electronAPI.send('start-google-login');
  });

  // Ação para login com LinkedIn (desabilitado - em breve)
  document.getElementById('linkedinLogin')?.addEventListener('click', async () => {
    // Obter idioma atual para traduzir o texto do botão
    const currentLanguage = await window.electronAPI.getLanguage();
    const loadingTexts = {
      'pt-BR': 'Entrando...',
      'en-US': 'Signing in...'
    };
    setLoginButtonLoading(true, loadingTexts[currentLanguage] || 'Entrando...');
    // Simula login LinkedIn (remover o Swal.fire e colocar chamada real quando disponível)
    setTimeout(() => {
      setLoginButtonLoading(false);
      Swal.fire({
        icon: 'info',
        title: 'Em breve',
        text: 'O login com LinkedIn estará disponível em breve!',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK'
      });
    }, 1200);
  });

  // Eventos de resposta de login com Google
  window.electronAPI.on('google-login-success', async (event, tokens) => {
    try {
      if (!tokens || !tokens.token) {
        throw new Error('Token não recebido do login com Google');
      }

      const token = tokens.token;
      localStorage.setItem('token', token);
      
      // Aguardar um pequeno delay para garantir que o token foi salvo
      await new Promise(resolve => setTimeout(resolve, 100));
      
      window.electronAPI.send('login-success', token);
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'Erro no Login',
        text: 'Não foi possível processar o login com Google: ' + error.message,
        confirmButtonColor: '#d33',
        confirmButtonText: 'OK'
      });
    }
    setLoginButtonLoading(false);
  });

  window.electronAPI.on('google-login-failed', async (event, message) => {
    await Swal.fire({
      icon: 'error',
      title: 'Falha no Login com Google',
      text: 'Não foi possível fazer login com Google: ' + message,
      confirmButtonColor: '#d33',
      confirmButtonText: 'OK'
    });
    setLoginButtonLoading(false);
  });

  // Evento para abrir tela de registro
  document.getElementById('registerLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    try {
      window.electronAPI.send('show-register');
    } catch (e) {
      // Erro ao abrir tela de registro
    }
  });

  setupDarkMode();
  setupLanguage();

  loadAppVersion();
});

// Função para carregar a versão do aplicativo
async function loadAppVersion() {
  try {
    const version = await window.electronAPI.getAppVersion();
    const versionButton = document.getElementById('versionButton');
    
    if (versionButton) {
      versionButton.querySelector('#appVersion').textContent = `v${version}`;
      versionButton.title = `Updates`;
      
      // Adicionar evento de clique
      versionButton.addEventListener('click', checkForUpdates);
    }
  } catch (error) {
    const versionButton = document.getElementById('versionButton');
    if (versionButton) {
      versionButton.querySelector('#appVersion').textContent = 'v?.?.?';
    }
  }
}

// Função para verificar atualizações
async function checkForUpdates() {
  try {
    const currentVersion = await window.electronAPI.getAppVersion();
    const latestVersion = await window.electronAPI.checkForUpdates();
    
    if (latestVersion && latestVersion !== currentVersion) {
      // Primeiro modal - Confirmação de atualização
      Swal.fire({
        title: translations[currentLanguage]['Confirmação'],
        html: `
          <div class="confirmation-dialog">
            <div class="confirmation-icon">
              <i class="fas fa-download"></i>
            </div>
            <div class="confirmation-content">
              <p>${translations[currentLanguage]['update_available']}</p>
              <div class="version-info">
                <span>${translations[currentLanguage]['current_version']}: v${currentVersion}</span>
                <span>${translations[currentLanguage]['new_version']}: v${latestVersion}</span>
              </div>
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: translations[currentLanguage]['Atualizar'],
        cancelButtonText: translations[currentLanguage]['Cancelar'],
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        customClass: {
          container: 'confirmation-dialog-container'
        }
      }).then(async (result) => {
        if (result.isConfirmed) {
          // Segundo modal - Confirmação de reinicialização
          Swal.fire({
            title: translations[currentLanguage]['Confirmação'],
            html: `
              <div class="confirmation-dialog">
                <div class="confirmation-icon">
                  <i class="fas fa-sync-alt"></i>
                </div>
                <div class="confirmation-content">
                  <p>${translations[currentLanguage]['restart_confirmation']}</p>
                </div>
              </div>
            `,
            showCancelButton: true,
            confirmButtonText: translations[currentLanguage]['Confirmar'],
            cancelButtonText: translations[currentLanguage]['Cancelar'],
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            customClass: {
              container: 'confirmation-dialog-container'
            }
          }).then((restartResult) => {
            if (restartResult.isConfirmed) {
              // Iniciar download e reiniciar
              window.electronAPI.downloadUpdate();
            }
          });
        }
      });
    } else {
      // Modal de versão atual
      Swal.fire({
        title: translations[currentLanguage]['Confirmação'],
        html: `
          <div class="confirmation-dialog">
            <div class="confirmation-icon">
              <i class="fas fa-check-circle"></i>
            </div>
            <div class="confirmation-content">
              <p>${translations[currentLanguage]['latest_version']}</p>
              <div class="version-info">
                <span>${translations[currentLanguage]['current_version']}: v${currentVersion}</span>
              </div>
            </div>
          </div>
        `,
        confirmButtonText: translations[currentLanguage]['OK'],
        confirmButtonColor: '#3085d6',
        customClass: {
          container: 'confirmation-dialog-container'
        }
      });
    }
  } catch (error) {
    Swal.fire({
      title: translations[currentLanguage]['Erro'],
      html: `
        <div class="confirmation-dialog">
          <div class="confirmation-icon">
            <i class="fas fa-exclamation-circle"></i>
          </div>
          <div class="confirmation-content">
            <p>${translations[currentLanguage]['update_check_error']}</p>
          </div>
        </div>
      `,
      confirmButtonText: translations[currentLanguage]['OK'],
      confirmButtonColor: '#3085d6',
      customClass: {
        container: 'confirmation-dialog-container'
      }
    });
  }
}
