const loadWithToken = (token, userUuid) => {
  fetch(`https://spaceapp-digital-api.onrender.com/spaces/${userUuid}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => response.json())
  .then(data => {
    if (Array.isArray(data.applications)) {
      const listContainer = document.getElementById("applicationsList");
      listContainer.innerHTML = "";

      data.applications.forEach(app => {
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

      // Adicionar evento de atualização para cada botão
      document.querySelectorAll('.update-button').forEach(button => {
        button.addEventListener('click', (event) => {
          const appId = event.target.getAttribute('data-app-id');
          const isActive = document.getElementById(`toggle-${appId}`).checked;
          updateSpace(token, userUuid, appId, isActive);
        });
      });
    }
  })
  .catch(error => console.error('Error loading applications:', error));
};

const updateSpace = (token, userUuid) => {
  const applicationToggles = document.querySelectorAll('.application-toggle input[type="checkbox"]');
  const applications = [];

  applicationToggles.forEach(toggle => {
    const uuid = toggle.id.replace('toggle-', '');
    const isActive = toggle.checked;
  
    applications.push({
      uuid: uuid,
      active: isActive
    });
  });

  const payload = {
    userUuid: userUuid,
    applications: applications
  };

  fetch(`https://spaceapp-digital-api.onrender.com/spaces`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  })
  .then(response => response.json())
  .then(data => {
      Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: 'Aplicações atualizadas com sucesso!',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK'
      }).then(() => {
        window.electronAPI.send('reload-applications');
      });
    })
  .catch(error => {
    console.error('Erro ao salvar aplicações:', error);
    alert('Erro ao salvar as configurações.');
  });
};


const populateUserData = (token, userUuid) => {
  fetch(`https://spaceapp-digital-api.onrender.com/users/${userUuid}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data && data.name && data.email && data.plan) {
      document.getElementById("userType").textContent = data.type || "Desconhecido";
      document.getElementById("userName").textContent = data.name;
      document.getElementById("userEmail").textContent = data.email;
      document.getElementById("userPlan").textContent = data.plan;
    }
  })
  .catch(error => console.error('Error loading user data:', error));
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

const displayAppVersion = () => {
  window.electronAPI.getAppVersion().then(version => {
    document.getElementById("appVersion").textContent = `Versão: ${version}`;
  }).catch(error => console.error('Erro ao obter a versão da aplicação:', error));
};

const setupDarkModeToggle = () => {
  const darkModeToggle = document.getElementById("dark-mode-toggle");
  if (darkModeToggle) {
    darkModeToggle.addEventListener("change", () => {
      document.body.classList.toggle("dark-mode", darkModeToggle.checked);
    });
  }
};

const initializeSettingsPage = () => {
  window.electronAPI.invoke('get-token').then(token => {
    if (token) {
      window.electronAPI.invoke('get-userUuid').then(userUuid => {
        if (userUuid) {
          loadWithToken(token, userUuid);
          populateUserData(token, userUuid);
        }
      }).catch(err => console.error('Erro ao obter userUuid:', err));
    }
  }).catch(err => console.error('Erro ao obter token:', err));

  setupZoomControl();
  setupDarkModeToggle();
  displayAppVersion();

  const saveButton = document.getElementById("saveButton");
  saveButton.addEventListener("click", () => {
    window.electronAPI.invoke('get-token').then(token => {
      if (token) {
        window.electronAPI.invoke('get-userUuid').then(userUuid => {
          if (userUuid) {
            updateSpace(token, userUuid);
          }
        }).catch(err => console.error('Erro ao obter userUuid:', err));
      }
    }).catch(err => console.error('Erro ao obter token:', err));
  });
  
};

initializeSettingsPage();
