const { ipcRenderer } = require('electron');
const axios = require('axios');
const Swal = require('sweetalert2');


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
        ipcRenderer.send('show-login');
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Erro inesperado',
          text: `Resposta inesperada: ${response.status}`,
          confirmButtonColor: '#d33',
          confirmButtonText: 'OK'
        });
      }
    } catch (error) {
      if (error.response) {
        const status = error.response.status;

        if (status === 400) {
          await Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Dados inválidos. Por favor, verifique os campos.',
            confirmButtonColor: '#d33',
            confirmButtonText: 'OK'
          });
        } else if (status === 409) {
          await Swal.fire({
            icon: 'warning',
            title: 'Atenção',
            text: 'Usuário já existe!',
            confirmButtonColor: '#f59e0b',
            confirmButtonText: 'OK'
          });
        } else {
          await Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: `Falha no registro. Código ${status}: ${error.response.data.message || 'Erro desconhecido'}`,
            confirmButtonColor: '#d33',
            confirmButtonText: 'OK'
          });
        }
      } else {
        console.error('Error without response:', error);
        await Swal.fire({
          icon: 'error',
          title: 'Erro de Rede',
          text: 'Erro de rede ou servidor. Tente novamente mais tarde.',
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
    ipcRenderer.send('show-login');
  });
});

  