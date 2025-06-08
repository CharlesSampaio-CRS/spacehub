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

// Aplicar dark mode imediatamente
setupDarkMode();

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');
  const passwordInput = document.getElementById('password');
  const strengthBar = document.getElementById('strengthBar');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = passwordInput.value;

    if (!name || !email || !password) {
      await Swal.fire({
        icon: 'warning',
        title: 'Campos obrigatórios',
        text: 'Por favor, preencha todos os campos.',
        confirmButtonColor: '#f59e0b',
        confirmButtonText: 'OK'
      });
      return;
    }

    try {
      const response = await axios.post('https://spaceapp-digital-api.onrender.com/register', {
        name,
        email,
        password
      });

      if (response.status === 201) {
        await Swal.fire({
          icon: 'success',
          title: 'Sucesso!',
          text: 'Conta criada com sucesso!',
          confirmButtonColor: '#3085d6',
          confirmButtonText: 'OK'
        });
        window.electronAPI.send('show-login');
      } else {
        throw new Error('Erro inesperado na resposta do servidor');
      }
    } catch (error) {
      console.error('Erro no registro:', error);
      console.error('Detalhes do erro:', {
        message: error.message,
        stack: error.stack,
        response: error.response
      });

      const statusCode = error.response?.status;
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message;

      if (statusCode === 400) {
        await Swal.fire({
          icon: 'error',
          title: 'Erro de Validação',
          text: errorMessage || 'Dados inválidos. Por favor, verifique os campos.',
          confirmButtonColor: '#d33',
          confirmButtonText: 'OK'
        });
      } else if (statusCode === 409) {
        await Swal.fire({
          icon: 'warning',
          title: 'Usuário já existe',
          text: 'Este usuário já está cadastrado em nossa plataforma.',
          confirmButtonColor: '#f59e0b',
          confirmButtonText: 'OK'
        });
      } else if (statusCode === 500) {
        await Swal.fire({
          icon: 'error',
          title: 'Erro no Servidor',
          text: errorMessage || 'Erro interno do servidor. Tente novamente mais tarde.',
          confirmButtonColor: '#d33',
          confirmButtonText: 'OK'
        });
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Erro',
          text: errorMessage || 'Ocorreu um erro ao tentar criar sua conta. Tente novamente.',
          confirmButtonColor: '#d33',
          confirmButtonText: 'OK'
        });
      }
    }
  });

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

  document.getElementById('loginLink').addEventListener('click', (e) => {
    e.preventDefault();
    window.electronAPI.send('show-login');
  });
});

  