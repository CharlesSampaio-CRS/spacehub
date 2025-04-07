const { contextBridge } = require('electron');
const Store = require('electron-store');
const store = new Store();

contextBridge.exposeInMainWorld('electronAPI', {
  getToken: () => store.get('token')
});
