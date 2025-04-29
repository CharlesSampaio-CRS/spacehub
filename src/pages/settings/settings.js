const getAuthData = async () => {
  try {
    const token = await window.electronAPI.invoke('get-token');
    const userUuid = await window.electronAPI.invoke('get-userUuid');
    return { token, userUuid };
  } catch (err) {
    console.error("Erro ao obter token ou userUuid:", err);
    return null;
  }
};

const loadApplications = async () => {
  const auth = await getAuthData();
  if (!auth) return;

  fetch(`https://spaceapp-digital-api.onrender.com/spaces/${auth.userUuid}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`
    }
  })
    .then(response => response.json())
    .then(data => {
      if (!Array.isArray(data.applications)) return;

      const listContainer = document.getElementById("applicationsList");
      listContainer.innerHTML = "";

      data.applications
        .sort((a, b) => b.active - a.active)
        .forEach(app => {
          const appItem = document.createElement("div");
          appItem.classList.add("application-item");

          appItem.innerHTML = `
            <div class="application-info">
              <img src="${app.icon}" alt="${app.application}" width="32" height="32" />
              <p><strong>${app.application}</strong></p>
            </div>
            <div class="application-toggle">
              <label class="toggle-switch">
                <input type="checkbox" ${app.active ? "checked" : ""} id="toggle-${app.uuid}" />
                <span class="slider"></span>
              </label>
            </div>
          `;

          listContainer.appendChild(appItem);
        });
    })
    .catch(error => console.error('Erro ao carregar aplicações:', error));
};

const updateApplications = async () => {
  try {
    const auth = await getAuthData();
    if (!auth) return;

    const toggles = document.querySelectorAll('.application-toggle input[type="checkbox"]');
    const applications = Array.from(toggles).map(toggle => ({
      uuid: toggle.id.replace('toggle-', ''),
      active: toggle.checked
    }));

    const payload = {
      userUuid: auth.userUuid,
      applications
    };

    // Desabilitar o botão de salvar
    const saveButton = document.getElementById("saveButton");
    if (saveButton) {
      saveButton.disabled = true;
    }

    // Enviar requisição PUT para salvar as configurações
    const res = await fetch('https://spaceapp-digital-api.onrender.com/spaces', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error('Erro ao salvar as configurações');
    }

    // Enviar comando para recarregar as aplicações via IPC
    await window.electronAPI.send('reload-applications');

    // Exibir alerta de sucesso
    Swal.fire({
      icon: 'success',
      title: 'Sucesso!',
      text: 'Aplicações atualizadas com sucesso!',
      confirmButtonColor: '#3085d6',
      confirmButtonText: 'OK'
    });
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
    alert('Erro ao salvar as configurações.');
  } finally {
    // Habilitar o botão de salvar novamente, independentemente de erro ou sucesso
    const saveButton = document.getElementById("saveButton");
    if (saveButton) {
      saveButton.disabled = false;
    }
  }
};

const loadUserInfo = async () => {
  const auth = await getAuthData();
  if (!auth) return;

  fetch(`https://spaceapp-digital-api.onrender.com/users/${auth.userUuid}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`
    }
  })
    .then(res => res.json())
    .then(data => {
      if (data?.name && data?.email && data?.plan) {
        document.getElementById("userType").textContent = data.type || "Desconhecido";
        document.getElementById("userName").textContent = data.name;
        document.getElementById("userEmail").textContent = data.email;
        document.getElementById("userPlan").textContent = data.plan;
      }
    })
    .catch(error => console.error('Erro ao carregar dados do usuário:', error));
};

const setupZoomControl = () => {
  const zoomInput = document.getElementById("zoom-range");
  const zoomValue = document.getElementById("zoom-value");

  zoomInput.addEventListener("input", () => {
    const scale = parseFloat(zoomInput.value);
    zoomValue.textContent = scale.toFixed(1);

    document.body.style.transform = `scale(${scale})`;
    document.body.style.transformOrigin = "center center";
    document.body.style.transition = "transform 0.2s ease";

    const scrollX = (document.body.scrollWidth * scale - window.innerWidth) / 2;
    const scrollY = (document.body.scrollHeight * scale - window.innerHeight) / 2;
    window.scrollTo(scrollX, scrollY);
  });
};

const setupDarkModeToggle = () => {
  const toggle = document.getElementById("dark-mode-toggle");
  if (!toggle) return;

  toggle.addEventListener("change", () => {
    document.body.classList.toggle("dark-mode", toggle.checked);
  });
};

const displayAppVersion = () => {
  window.electronAPI.getAppVersion()
    .then(version => {
      document.getElementById("appVersion").textContent = `Versão: ${version}`;
    })
    .catch(err => console.error('Erro ao obter versão da aplicação:', err));
};

const initializeSettingsPage = () => {
  loadApplications();
  loadUserInfo();
  setupZoomControl();
  setupDarkModeToggle();
  displayAppVersion();

  const saveButton = document.getElementById("saveButton");
  if (saveButton) {
    saveButton.addEventListener("click", updateApplications);
  }
};

initializeSettingsPage();
