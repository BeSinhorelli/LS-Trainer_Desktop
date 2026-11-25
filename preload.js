const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('navegador', {
  devtools: () => ipcRenderer.invoke('devtools'),
});