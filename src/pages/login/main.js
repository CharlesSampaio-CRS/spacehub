const { ipcRenderer } = require("electron");

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
  
    try {
      const { data } = await axios.post('https://spaceapp-digital-api.onrender.com/login', {
        email,
        password
      });
  
      localStorage.setItem('token', data.token);
      const token = localStorage.getItem('token')
      ipcRenderer.send('login-success',token);
    
    } catch (error) {
      console.error('Erro no login:', error);
      alert('Usuário ou senha inválidos');
    }
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('loginButton').addEventListener('click', login);
  });
  