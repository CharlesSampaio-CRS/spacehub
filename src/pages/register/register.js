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
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const registerButton = document.getElementById('registerButton');

  // Obter o idioma atual do Electron
  window.electronAPI.getLanguage().then(currentLanguage => {
    const translations = {
      'pt-BR': {
        'Nome inválido': 'Nome inválido',
        'Email inválido': 'Email inválido',
        'Senha inválida': 'Senha inválida',
        'As senhas não coincidem': 'As senhas não coincidem',
        'Preencha todos os campos': 'Preencha todos os campos'
      },
      'en-US': {
        'Nome inválido': 'Invalid name',
        'Email inválido': 'Invalid email',
        'Senha inválida': 'Invalid password',
        'As senhas não coincidem': 'Passwords do not match',
        'Preencha todos os campos': 'Please fill in all fields'
      }
    };

    if (!name || !email || !password || !confirmPassword) {
      showError(translations[currentLanguage]['Preencha todos os campos']);
      registerButton.disabled = true;
      return false;
    }

    if (name.length < 3) {
      showError(translations[currentLanguage]['Nome inválido']);
      registerButton.disabled = true;
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError(translations[currentLanguage]['Email inválido']);
      registerButton.disabled = true;
      return false;
    }

    if (password.length < 6) {
      showError(translations[currentLanguage]['Senha inválida']);
      registerButton.disabled = true;
      return false;
    }

    if (password !== confirmPassword) {
      showError(translations[currentLanguage]['As senhas não coincidem']);
      registerButton.disabled = true;
      return false;
    }

    document.getElementById('errorMessage').style.display = 'none';
    registerButton.disabled = false;
    return true;
  });
};

const setupDarkMode = () => {
  // Verificar o estado atual do modo escuro no store do Electron
  window.electronAPI.getDarkMode().then(isDarkMode => {
    document.documentElement.classList.toggle("dark-mode", isDarkMode);
    document.body.classList.toggle("dark-mode", isDarkMode);
    localStorage.setItem('darkMode', isDarkMode);
  });

  // Adicionar listener para mudanças no modo escuro
  window.electronAPI.onDarkModeChanged((isDark) => {
    document.documentElement.classList.toggle("dark-mode", isDark);
    document.body.classList.toggle("dark-mode", isDark);
    localStorage.setItem('darkMode', isDark);
  });
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  setupDarkMode();
  setupLanguage();

  const registerForm = document.getElementById('registerForm');
  const registerButton = document.getElementById('registerButton');
  const loginLink = document.getElementById('loginLink');

  // Validar formulário em tempo real
  registerForm.addEventListener('input', validateForm);

  // Enviar formulário
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const formData = {
      name: document.getElementById('name').value,
      email: document.getElementById('email').value,
      password: document.getElementById('password').value
    };

    try {
      const result = await window.electronAPI.register(formData);
      if (result.success) {
        window.location.href = '../login/login.html';
      } else {
        window.electronAPI.getLanguage().then(currentLanguage => {
          const translations = {
            'pt-BR': { 'Erro ao criar conta': 'Erro ao criar conta' },
            'en-US': { 'Erro ao criar conta': 'Error creating account' }
          };
          showError(translations[currentLanguage]['Erro ao criar conta']);
        });
      }
    } catch (error) {
      console.error('Erro ao registrar:', error);
      window.electronAPI.getLanguage().then(currentLanguage => {
        const translations = {
          'pt-BR': { 'Erro ao criar conta': 'Erro ao criar conta' },
          'en-US': { 'Erro ao criar conta': 'Error creating account' }
        };
        showError(translations[currentLanguage]['Erro ao criar conta']);
      });
    }
  });

  // Link para login
  loginLink.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '../login/login.html';
  });
});

  