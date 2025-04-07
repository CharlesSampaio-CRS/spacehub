document.addEventListener('DOMContentLoaded', () => {
  const applications = [
    { id: 1, name: 'SpaceChat', status: 'Ativo' },
    { id: 2, name: 'AstroFeed', status: 'Inativo' },
    { id: 3, name: 'Galáxia Store', status: 'Em revisão' }
  ];

  const applicationsList = document.getElementById('applicationsList');

  applications.forEach(app => {
    const card = document.createElement('div');
    card.classList.add('application-card');

    card.innerHTML = `
      <div class="application-info">
        <h3>${app.name}</h3>
        <p>ID: ${app.id}</p>
      </div>
      <div class="application-status">
        <label for="status-${app.id}">Status:</label>
        <select id="status-${app.id}" data-id="${app.id}">
          <option ${app.status === 'Ativo' ? 'selected' : ''}>Ativo</option>
          <option ${app.status === 'Inativo' ? 'selected' : ''}>Inativo</option>
          <option ${app.status === 'Em revisão' ? 'selected' : ''}>Em revisão</option>
        </select>
      </div>
    `;

    applicationsList.appendChild(card);
  });

  applicationsList.addEventListener('change', (event) => {
    if (event.target.tagName === 'SELECT') {
      const appId = event.target.getAttribute('data-id');
      const newStatus = event.target.value;
      console.log(`Aplicação ${appId} atualizada para: ${newStatus}`);
      // Aqui você pode chamar sua API para atualizar o status no backend
      // axios.post('/api/updateStatus', { id: appId, status: newStatus })
    }
  });
});
