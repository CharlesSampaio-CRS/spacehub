document.addEventListener('DOMContentLoaded', async () => {
  const applicationsList = document.getElementById('applicationsList');
  const token = localStorage.getItem('token');

  if (!token) {
    applicationsList.innerHTML = '<p>Token de autenticação não encontrado.</p>';
    return;
  }

  try {
    const response = await axios.get('https://spaceapp-digital-api.onrender.com/applications', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const applications = response.data;

    applications.forEach(app => {
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
            <input type="checkbox" id="toggle-${app.id}" data-appname="${app.application}" ${app.status === 'Ativo' ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
          <span class="status-label" id="status-label-${app.id}">${app.status === 'Ativo' ? 'Ativo' : 'Inativo'}</span>
        </div>
      `;

      applicationsList.appendChild(card);
    });

    // Evento centralizado para todos os toggles
    applicationsList.addEventListener('change', async (event) => {
      if (event.target.type === 'checkbox') {
        const checkbox = event.target;
        const appId = checkbox.id.replace('toggle-', '');
        const appName = checkbox.dataset.appname;
        const statusLabel = document.getElementById(`status-label-${appId}`);
        const previousChecked = !checkbox.checked; // valor anterior
        const newStatus = checkbox.checked ? 'Ativo' : 'Inativo';

        // Desabilita enquanto envia
        checkbox.disabled = true;

        // Coletar todas as aplicações "Ativo" após essa mudança
        const selectedApps = Array.from(document.querySelectorAll('.application-status input[type="checkbox"]:checked'))
          .map(cb => cb.dataset.appname);

        try {
          await axios.post(
            'https://spaceapp-digital-api.onrender.com/space',
            {
              userUuid: userUuid,
              applications: selectedApps
            },
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );

          console.log(` Status da aplicação ${appName} atualizado para ${newStatus}`);
          statusLabel.textContent = newStatus;
        } catch (err) {
          console.error(' Erro ao atualizar status:', {
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
    console.error('❌ Erro ao buscar aplicações:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });

    applicationsList.innerHTML = '<p>Erro ao carregar aplicações. Verifique sua conexão ou tente novamente mais tarde.</p>';
  }
});
