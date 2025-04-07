async function getApplications() {
  const container = document.getElementById('nav-applications');
  
  if (!container) {
    console.warn('Container "nav-applications" not found.');
    return;
  }

  const token = localStorage.getItem('token'); 

  if (!token) {
    console.warn('Token not found! Is the user logged in?');
    return;
  }

  try {
    const { data } = await axios.get('https://spaceapp-digital-api.onrender.com/applications', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    container.innerHTML = ''; 

    data.forEach(app => {
      const button = createApplicationButton(app);
      container.appendChild(button);
    });

  } catch (error) {
    console.error('Failed to fetch applications:', error);
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
    if (webview.src !== app.url) {
      webview.src = app.url;
      console.log(`Opening: ${app.url}`);
    } else {
      console.log(`App ${app.application} already loaded.`);
    }
  });

  return button;
}

getApplications();
