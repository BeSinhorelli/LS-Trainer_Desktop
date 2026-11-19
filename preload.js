const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('navegador', {
  // ───────────────────────────────────────────────────────────
  // Navegação
  // ───────────────────────────────────────────────────────────
  navegar:    (input) => ipcRenderer.invoke('navegar', input),
  voltar:     () => ipcRenderer.invoke('voltar'),
  avancar:    () => ipcRenderer.invoke('avancar'),
  recarregar: () => ipcRenderer.invoke('recarregar'),
  home:       () => ipcRenderer.invoke('home'),

  // ───────────────────────────────────────────────────────────
  // Abas
  // ───────────────────────────────────────────────────────────
  novaAba:   () => ipcRenderer.invoke('nova-aba'),
  fecharAba: (id) => ipcRenderer.invoke('fechar-aba', id),
  ativarAba: (id) => ipcRenderer.invoke('ativar-aba', id),

  // ───────────────────────────────────────────────────────────
  // Ferramentas
  // ───────────────────────────────────────────────────────────
  devtools: () => ipcRenderer.invoke('devtools'),

  // ───────────────────────────────────────────────────────────
  // Eventos vindos do main
  // ───────────────────────────────────────────────────────────
  onAbaCriada:     (cb) => ipcRenderer.on('aba-criada',     (_, d) => cb(d)),
  onAbaFechada:    (cb) => ipcRenderer.on('aba-fechada',    (_, d) => cb(d)),
  onAbaAtiva:      (cb) => ipcRenderer.on('aba-ativa',      (_, d) => cb(d)),
  onAbaAtualizada: (cb) => ipcRenderer.on('aba-atualizada', (_, d) => cb(d)),
  onAbaFavicon:    (cb) => ipcRenderer.on('aba-favicon',    (_, d) => cb(d)),
});