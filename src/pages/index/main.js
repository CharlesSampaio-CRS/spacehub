async function getApplications() {
  const container = document.getElementById('nav-applications');
  if (!container) return console.warn('Container "nav-applications" not found.');

  const token = localStorage.getItem('token');
  if (!token) return console.warn('Token not found! Is the user logged in?');

  const payload = parseJwt(token);
  if (!payload?.uuid) return console.warn('Invalid token payload.');

  try {
    const { data } = await axios.get(
      `https://spaceapp-digital-api.onrender.com/spaces/${payload.uuid}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const applications = data[0]?.applications || [];
    if (!applications.length) return console.warn('No applications found.');

    const fragment = document.createDocumentFragment();
    applications.forEach(app => fragment.appendChild(createApplicationButton(app)));

    container.replaceChildren(fragment);
  } catch (error) {
    console.error('Failed to fetch applications:', error);
  }
}

function createApplicationButton(app) {
  const button = document.createElement('button');
  button.className = 'nav-button';
  button.dataset.nav = app.application.toLowerCase();
  button.title = app.application;

  const img = document.createElement('img');
  img.src = `../../assets/${app.application.toLowerCase()}.png`;
  img.alt = app.application;

  // fallback: se imagem falhar, usa o ícone vindo da API
  img.onerror = () => img.src = app.icon;

  button.appendChild(img);

  button.addEventListener('click', () => {
    const webview = document.getElementById('webview');
    if (webview && webview.src !== app.url) {
      webview.src = app.url;
    }
  });

  return button;
}

function parseJwt(token) {
  try {
    const base64Payload = token.split('.')[1];
    const payload = atob(base64Payload);
    return JSON.parse(payload);
  } catch (e) {
    console.error('Failed to parse JWT', e);
    return null;
  }
}

getApplications();
