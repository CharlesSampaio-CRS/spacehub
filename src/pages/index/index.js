async function getApplications() {
  const container = document.getElementById('nav-applications');
  if (!container) return console.info('Container "nav-applications" not found.');

  const token = localStorage.getItem('token');
  if (!token) return console.warn('Token not found! Is the user logged in?');

  const payload = parseJwt(token);
  if (!payload?.uuid) return console.warn('Invalid token payload.');

  try {
    const { data } = await axios.get(
      `https://spaceapp-digital-api.onrender.com/spaces/${payload.uuid}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const applications = data.applications || [];

    if (!applications.length) return console.warn('No applications found.');

    applications.sort((a, b) => a.popularity - b.popularity);

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

  // Estilo compacto e moderno do botão
  Object.assign(button.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '42px',
    height: '42px',
    margin: '6px',
    padding: '6px',
    border: 'none',
    borderRadius: '12px',
    backgroundColor: '#fff',
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  });

  // Efeito hover
  button.addEventListener('mouseover', () => {
    button.style.transform = 'scale(1.1)';
    button.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.2)';
  });

  button.addEventListener('mouseout', () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.1)';
  });

  // Ícone do app
  const img = document.createElement('img');
  img.src = `../../assets/${app.application.toLowerCase()}.png`;
  img.alt = app.application;

  Object.assign(img.style, {
    width: '28px',
    height: '28px',
    objectFit: 'contain',
    borderRadius: '6px',
  });

  // Fallback pro ícone remoto
  img.onerror = () => {
    img.src = app.icon;
  };

  button.appendChild(img);

  // Click carrega app
  button.addEventListener('click', () => {
    const webview = document.getElementById('webview');
    if (webview && webview.src !== app.url) {
      webview.src = app.url;
    }
  });

  return button;
}


async function getUserNameFromToken() {
  const token = localStorage.getItem('token');
  if (!token) return console.warn('Token not found! Is the user logged in?');

  const payload = parseJwt(token);
  if (!payload?.name) return console.warn('No name found in token payload.');

  return payload.name;
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

function smoothLoadWebview(newSrc) {
  const webview = document.getElementById('webview');

  if (!webview) return;

  webview.classList.add('fade-out');

  setTimeout(() => {
    webview.addEventListener('did-finish-load', () => {
      webview.classList.remove('fade-out');
    }, { once: true });

    webview.src = newSrc;
  }, 400); 
}

getApplications();
