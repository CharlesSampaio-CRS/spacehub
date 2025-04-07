const { ipcRenderer } = require('electron');
const axios = require('axios');

const apiUrlArg = process.argv.find(arg => arg.startsWith('--api-url='));
const API_URL = apiUrlArg ? apiUrlArg.split('=')[1] : '';

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
      alert('Please fill in all required fields.');
      return;
    }

    try {
      const { data } = await axios.post(`${API_URL}/register`, {
        name,
        email,
        password
      });

      alert('Account created successfully!');
      ipcRenderer.send('show-login');
    } catch (error) {
      console.error('Registration error:', error);
      alert('Failed to create account. Please try again.');
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
