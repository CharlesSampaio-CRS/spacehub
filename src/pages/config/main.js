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

    console.log('Aplicações carregadas com sucesso:');
    console.log(JSON.stringify(response, null, 2));

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
    <input type="checkbox" id="toggle-${app.id}" ${app.status === 'Ativo' ? 'checked' : ''}>
    <span class="slider"></span>
  </label>
  <span class="status-label" id="status-label-${app.id}">${app.status}</span>
</div>
      `;

      applicationsList.appendChild(card);
    });
  } catch (error) {
    console.error('❌ Erro ao buscar aplicações:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });

    applicationsList.innerHTML = '<p>Erro ao carregar aplicações. Verifique sua conexão ou tente novamente mais tarde.</p>';
  }

  applicationsList.addEventListener('change', (event) => {
    if (event.target.type === 'checkbox') {
      const appId = event.target.id.split('-')[1];
      const isChecked = event.target.checked;
      const newStatus = isChecked ? 'Ativo' : 'Inativo';

      // Atualiza o texto ao lado do toggle
      const statusLabel = document.getElementById(`status-label-${appId}`);
      statusLabel.textContent = newStatus;

      console.log(`🔄 Aplicação ${appId} atualizada para: ${newStatus}`);

      axios.post(
        'https://spaceapp-digital-api.onrender.com/applications/update',
        { id: appId, status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      ).then(res => {
        console.log('✅ Status atualizado com sucesso!');
      }).catch(err => {
        console.error('❌ Erro ao atualizar status:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
        });
        alert('Erro ao atualizar status. Verifique sua conexão ou tente novamente.');
      });
    }
  });
});
