document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem('token');
  const payload = parseJwt(token);

  if (!payload || !payload.uuid) {
    alert('Token inválido.');
    return;
  }

  try {
    const response = await axios.get(`https://spaceapp-digital-api.onrender.com/users/${payload.uuid}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const user = response.data;

    document.getElementById("userName").textContent = user.name || 'Não informado';
    document.getElementById("userEmail").textContent = user.email || 'Não informado';
    document.getElementById("userPlan").textContent = user.plan || 'Não informado';
    document.getElementById("userType").textContent = user.type || 'Não informado';
    
    // Ajuste para o switch do Google ID
    const userGoogleIdToggle = document.getElementById("userGoogleToggle");
    if (user.googleId) {
      userGoogleIdToggle.checked = true; // Se o usuário tiver um googleId, o toggle será ativado
    }

  } catch (error) {
    console.error('Erro ao buscar dados do usuário:', error);
  }
});

function parseJwt(token) {
  try {
    const base64Payload = token.split('.')[1];
    const base64 = base64Payload.replace(/-/g, '+').replace(/_/g, '/');
    const payload = atob(base64);
    return JSON.parse(payload);
  } catch (e) {
    console.error('Erro ao decodificar token JWT:', e);
    return null;
  }
}