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
    ipcRenderer.send('login-success', data.token);
  } catch (error) {
    console.error('Login error:', error);
    alert('Invalid email or password');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginButton').addEventListener('click', login);
});
