document.addEventListener('DOMContentLoaded', async () => {
  const applicationsList = document.getElementById('applicationsList');
  const token = localStorage.getItem('token');

  if (!token) {
    applicationsList.innerHTML = '<p>Token de autenticação não encontrado.</p>';
    return;
  }

  const payload = parseJwt(token); 
  if (!payload || !payload.uuid) {
    applicationsList.innerHTML = '<p>Token inválido.</p>';
    return;
  }

  try {
    // 1. Buscar todas as aplicações
    const [appsResponse, spaceResponse] = await Promise.all([
      axios.get('https://spaceapp-digital-api.onrender.com/applications', {
        headers: { Authorization: `Bearer ${token}` }
      }),
      axios.get(`https://spaceapp-digital-api.onrender.com/spaces/${payload.uuid}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    ]);

    const applications = appsResponse.data;
    const userApplicationsUuid = spaceResponse.data.applications.map(app => app.uuid);

    // 2. Renderizar os cards com status baseado nas aplicações do usuário
    applications.forEach(app => {
      const isActive = userApplicationsUuid.includes(app.uuid);
      const card = document.createElement('div');
      card.classList.add('application-card');
      const iconSrc = `../../assets/${app.application.toLowerCase()}.png`;

      card.innerHTML = `
        <div class="application-info">
          <img src="${iconSrc}" alt="${app.application} icon" class="application-icon" />
          <h1>${app.application}</h1>
        </div>
        <div class="application-status">
          <p>Status:</p>
          <label class="switch">
            <input 
              type="checkbox" 
              id="toggle-${app.id}" 
              data-appname="${app.application}" 
              data-uuid="${app.uuid}" 
              ${isActive ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
          <span class="status-label" id="status-label-${app.id}">${isActive ? 'Ativo' : 'Inativo'}</span>
        </div>
      `;

      applicationsList.appendChild(card);
    });

    // 3. Atualizar status ao alternar checkbox
    applicationsList.addEventListener('change', async (event) => {
      if (event.target.type === 'checkbox') {
        const checkbox = event.target;
        const appId = checkbox.id.replace('toggle-', '');
        const appName = checkbox.dataset.appname;
        const statusLabel = document.getElementById(`status-label-${appId}`);
        const previousChecked = !checkbox.checked;
        const newStatus = checkbox.checked ? 'Ativo' : 'Inativo';

        checkbox.disabled = true;

        const selectedApps = Array.from(document.querySelectorAll('.application-status input[type="checkbox"]:checked'))
          .map(cb => cb.dataset.uuid); 

        try {
          await axios.put(
            'https://spaceapp-digital-api.onrender.com/spaces',
            {
              userUuid: payload.uuid,
              applicationsUuid: selectedApps
            },
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );
          statusLabel.textContent = newStatus;
        } catch (err) {
          console.error('Erro ao atualizar status:', {
            message: err.message,
            response: err.response?.data,
            status: err.response?.status
          });

          alert('Erro ao atualizar status. Verifique sua conexão ou tente novamente.');
          checkbox.checked = previousChecked;
        } finally {
          checkbox.disabled = false;
        }
      }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar dados:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });

    applicationsList.innerHTML = '<p>Erro ao carregar aplicações. Verifique sua conexão ou tente novamente mais tarde.</p>';
  }
});

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
