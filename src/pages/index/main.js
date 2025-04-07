document.addEventListener('DOMContentLoaded', getApplications);

async function getApplications() {
  const container = document.getElementById('nav-applications');

  const token = localStorage.getItem('token'); 

  if (!token) {
    console.warn('Token não encontrado no localStorage');
    return;
  }

  try {
    const { data } = await axios.get('https://spaceapp-digital-api.onrender.com/applications', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    data.forEach(app => {
      const button = createApplicationButton(app);
      container.appendChild(button);
    });

  } catch (error) {
    console.error('Erro ao buscar aplicações:', error);
  }
}

function createApplicationButton(app) {
  const button = document.createElement('button');
  button.className = 'nav-button';
  button.setAttribute('data-nav', app.application.toLowerCase());
  button.setAttribute('title', app.application);
  button.setAttribute('alt', app.application);

  const img = document.createElement('img');
  img.src = `../../assets/${app.application.toLowerCase()}.png`;
  img.alt = app.application;

  button.appendChild(img);

  button.addEventListener('click', () => {
    const webview = document.getElementById('webview');
    webview.src = app.url;
    console.log(`Abrindo: ${app.url}`);
  });

  return button;
}
