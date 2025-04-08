

function parseJwt(token) {
    try {
      const base64Payload = token.split('.')[1]; // Pega a parte do payload
      const payload = atob(base64Payload);       // Decodifica de base64
      return JSON.parse(payload);                // Converte para objeto JS
    } catch (e) {
      console.error('Failed to parse JWT', e);
      return null;
    }
  }