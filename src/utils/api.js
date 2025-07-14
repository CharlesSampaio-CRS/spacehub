const axios = require('axios');

const API_BASE_URL = 'https://spaceapp-digital-api.onrender.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Função de login
async function login(email, password) {
  const { data } = await api.post('/login', { email, password });
  return data;
}

// Função de registro
async function register({ name, email, password }) {
  const { data } = await api.post('/register', {
    name,
    email,
    password,
    plan: 'free',
    createdAt: new Date().toISOString(),
  });
  return data;
}

// Buscar usuário
async function getUser(userUuid, token) {
  const { data } = await api.get(`/users/${userUuid}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

// Buscar aplicações do usuário
async function getSpaces(userUuid, token) {
  const { data } = await api.get(`/spaces/${userUuid}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

// Atualizar aplicações do usuário
async function updateSpaces(userUuid, applications, token) {
  const { data } = await api.put('/spaces', {
    userUuid,
    applications,
  }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

// Buscar todos os usuários free
async function getFreeUsers() {
  const { data } = await api.get('/users/free-users');
  return data;
}

module.exports = {
  login,
  register,
  getUser,
  getSpaces,
  updateSpaces,
  getFreeUsers,
  api, // exporta a instância para casos especiais
}; 