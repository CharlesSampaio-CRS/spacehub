const setupLanguage = () => {
  window.electronAPI.getLanguage().then(language => {
    document.documentElement.lang = language;
    translatePage(language);
  });

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

const validateForm = async () => {
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const registerButton = document.getElementById('registerButton');

  const currentLanguage = await window.electronAPI.getLanguage();

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
};

const setupDarkMode = () => {
  window.electronAPI.getDarkMode().then(isDarkMode => {
    document.documentElement.classList.toggle("dark-mode", isDarkMode);
    document.body.classList.toggle("dark-mode", isDarkMode);
    localStorage.setItem('darkMode', isDarkMode);
  });

  window.electronAPI.onDarkModeChanged((isDark) => {
    document.documentElement.classList.toggle("dark-mode", isDark);
    document.body.classList.toggle("dark-mode", isDark);
    localStorage.setItem('darkMode', isDark);
  });
};

document.addEventListener('DOMContentLoaded', () => {
  setupDarkMode();
  setupLanguage();

  const registerForm = document.getElementById('registerForm');
  const registerButton = document.getElementById('registerButton');
  const loginLink = document.getElementById('loginLink');
  const passwordInput = document.getElementById('password');
  const strengthBar = document.getElementById('strengthBar');

  // Força da senha (opcional)
  passwordInput.addEventListener('input', () => {
    const password = passwordInput.value;
    let strength = 0;
    if (password.length > 0) strength += 20;
    if (password.length >= 8) strength += 30;
    if (/[A-Z]/.test(password)) strength += 15;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^A-Za-z0-9]/.test(password)) strength += 20;

    strengthBar.style.width = `${strength}%`;
    strengthBar.style.backgroundColor =
      strength < 40 ? '#ef4444' :
      strength < 70 ? '#f59e0b' :
      '#10b981';
  });

  // Validação em tempo real
  registerForm.addEventListener('input', async () => {
    await validateForm();
  });

  // Envio do formulário
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const isValid = await validateForm();
    if (!isValid) return;

    const formData = {
      name: document.getElementById('name').value.trim(),
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value
    };

    try {
      const result = await window.electronAPI.register(formData);
      if (result.success) {
        window.location.href = '../login/login.html';
      } else {
        const currentLanguage = await window.electronAPI.getLanguage();
        const translations = {
          'pt-BR': { 'Erro ao criar conta': 'Erro ao criar conta' },
          'en-US': { 'Erro ao criar conta': 'Error creating account' }
        };
        showError(translations[currentLanguage]['Erro ao criar conta']);
      }
    } catch (error) {
      console.error('Erro ao registrar:', error);
      const currentLanguage = await window.electronAPI.getLanguage();
      const translations = {
        'pt-BR': { 'Erro ao criar conta': 'Erro ao criar conta' },
        'en-US': { 'Erro ao criar conta': 'Error creating account' }
      };
      showError(translations[currentLanguage]['Erro ao criar conta']);
    }
  });

  loginLink.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '../login/login.html';
  });
});
