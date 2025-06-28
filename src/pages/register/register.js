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

      if (result.status === 201) {
        // Modal de sucesso
        const currentLanguage = await window.electronAPI.getLanguage();
        const successTranslations = {
          'pt-BR': {
            title: 'Conta criada com sucesso!',
            text: 'Você será redirecionado para o login.'
          },
          'en-US': {
            title: 'Account created successfully!',
            text: 'You will be redirected to login.'
          }
        };
        
        await Swal.fire({
          icon: 'success',
          title: successTranslations[currentLanguage].title,
          text: successTranslations[currentLanguage].text,
          confirmButtonColor: '#10b981',
          confirmButtonText: 'OK'
        });
        window.location.href = '../login/login.html';
      } else {
        // Erro conhecido retornado pela API
        const currentLanguage = await window.electronAPI.getLanguage();
        const errorTranslations = {
          'pt-BR': {
            title: 'Erro ao criar conta',
            defaultMessage: 'Erro desconhecido ao criar conta.',
            networkError: 'Erro de conexão. Verifique sua internet e tente novamente.',
            serverError: 'Erro no servidor. Tente novamente em alguns instantes.',
            userExists: 'Usuário ou email já registrado.'
          },
          'en-US': {
            title: 'Error creating account',
            defaultMessage: 'Unknown error creating account.',
            networkError: 'Connection error. Check your internet and try again.',
            serverError: 'Server error. Try again in a few moments.',
            userExists: 'User or email already registered.'
          }
        };
        
        const errorMsg = result.data?.message || errorTranslations[currentLanguage].defaultMessage;
        await Swal.fire({
          icon: 'error',
          title: errorTranslations[currentLanguage].title,
          text: errorMsg,
          confirmButtonColor: '#ef4444',
          confirmButtonText: 'OK'
        });
      }
    } catch (error) {
      const currentLanguage = await window.electronAPI.getLanguage();
      const errorTranslations = {
        'pt-BR': {
          title: 'Erro ao criar conta',
          defaultMessage: 'Erro desconhecido ao criar conta.',
          networkError: 'Erro de conexão. Verifique sua internet e tente novamente.',
          serverError: 'Erro no servidor. Tente novamente em alguns instantes.',
          userExists: 'Usuário ou email já registrado.'
        },
        'en-US': {
          title: 'Error creating account',
          defaultMessage: 'Unknown error creating account.',
          networkError: 'Connection error. Check your internet and try again.',
          serverError: 'Server error. Try again in a few moments.',
          userExists: 'User or email already registered.'
        }
      };

      let errorMsg = errorTranslations[currentLanguage].defaultMessage;

      // Tratar mensagem específica do Electron
      if (error?.message && error.message.includes('Error invoking remote method')) {
        // Verificar se é erro de usuário já existente
        if (error.message.includes('[object Object]')) {
          errorMsg = errorTranslations[currentLanguage].userExists;
        } else {
          errorMsg = errorTranslations[currentLanguage].networkError;
        }
      }
      // Capturar mensagem de erro estruturada do main process
      else if (error?.message) {
        errorMsg = error.message;
      } else if (error?.data?.error) {
        errorMsg = error.data.error;
      } else if (error?.data?.message) {
        errorMsg = error.data.message;
      } else {
        try {
          errorMsg = JSON.stringify(error);
        } catch {
          errorMsg = String(error);
        }
      }

      await Swal.fire({
        icon: 'error',
        title: errorTranslations[currentLanguage].title,
        text: errorMsg,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'OK'
      });
    }
  });

  loginLink.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '../login/login.html';
  });
});
