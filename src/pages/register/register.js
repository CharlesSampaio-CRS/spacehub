const { ipcRenderer } = require('electron');
const axios = require('axios');

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
        const response = await axios.post('https://spaceapp-digital-api.onrender.com/register', {
          name,
          email,
          password
        });
  
        if (response.status === 201) {
          alert('Account created successfully!');
          ipcRenderer.send('show-login');
        } else {
          alert(`Unexpected response: ${response.status}`);
        }
      } catch (error) {
        if (error.response) {
          const status = error.response.status;
  
          if (status === 400) {
            alert('Invalid data.');
          } else if (status === 409) {
            alert('User already exists.');
          } else {
            alert(`Registration failed with status ${status}: ${error.response.data.message || 'Unknown error'}`);
          }
        } else {
          console.error('Error without response:', error);
          alert('Network or server error. Please try again later.');
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
  