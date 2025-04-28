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
              <input type="checkbox" ${app.active ? "checked" : ""} disabled />
              <span class="slider"></span>
            </label>
          </div>
        `;

        listContainer.appendChild(appItem);
      });
    }
  })
  .catch(error => console.error('Error loading applications:', error));
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
      document.getElementById("userType").textContent = data.type || "Desconhecido"; // Se o tipo não existir, usa "Desconhecido"
      document.getElementById("userName").textContent = data.name;
      document.getElementById("userEmail").textContent = data.email;
      document.getElementById("userPlan").textContent = data.plan;
    } else {
      console.error('Dados do usuário não encontrados ou incompletos.');
    }
  })
  .catch(error => {
    console.error('Erro ao obter dados do usuário:', error);
  });
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

const initiateUpdate = async () => {
  try {
    await window.electronAPI.checkForUpdates();
  } catch (error) {
    console.error('Erro ao verificar atualizações:', error);

  }
};

const displayAppVersion = () => {
  window.electronAPI.getAppVersion().then(version => {
    document.getElementById("appVersion").textContent = `Versão: ${version}`;
  }).catch(error => {
    console.error('Erro ao obter a versão da aplicação:', error);
  });
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
          // Agora que token e userUuid estão disponíveis, podemos carregar os dados
          loadWithToken(token, userUuid);  // Carrega as aplicações
          populateUserData(token, userUuid); // Preenche os dados do usuário
        } else {
          console.error('Failed to get userUuid');
        }
      }).catch(err => console.error('Failed to get userUuid:', err));
    } else {
      console.error('Failed to get token');
    }
  }).catch(err => console.error('Failed to get token:', err));

  setupZoomControl();
  setupDarkModeToggle();
  displayAppVersion();

  document.getElementById("update-version-button").addEventListener("click", initiateUpdate);

};

initializeSettingsPage();
