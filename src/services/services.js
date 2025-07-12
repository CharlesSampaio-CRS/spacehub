const API_BASE_URL = 'https://spaceapp-digital-api.onrender.com';

function getToken() {
  return localStorage.getItem('token');
}

async function fetchGET(url, token = getToken()) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ${response.status}: ${errorText}`);
  }

  return response.json();
}

export async function getApplications(token = getToken()) {
  const url = `${API_BASE_URL}/applications`;
  return fetchGET(url, token);
}

export async function getSpaceByUserUuid(token = getToken()) {
  const payload = parseJwt(token);
  if (!payload?.uuid) throw new Error("UUID inválido no token.");
  const url = `${API_BASE_URL}/spaces/${payload.uuid}`;
  return fetchGET(url, token);
}

function parseJwt(token) {
  try {
    const base64Payload = token.split('.')[1];
    const decodedPayload = atob(base64Payload);  
    return JSON.parse(decodedPayload);
  } catch (e) {
    return null;
  }
}
