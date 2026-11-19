const { app, BrowserWindow, WebContentsView, ipcMain, session } = require('electron');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════
// Configuração
// ═══════════════════════════════════════════════════════════════════
const HOME_URL = 'https://ls-trainer.vercel.app';
const TOPBAR_HEIGHT = 96;

// ═══════════════════════════════════════════════════════════════════
// Estado global
// ═══════════════════════════════════════════════════════════════════
let mainWindow = null;
let abaAtivaId = null;
let proximoAbaId = 1;
const abas = new Map();

// ═══════════════════════════════════════════════════════════════════
// Utilitários
// ═══════════════════════════════════════════════════════════════════
function atualizarLimitesView(view) {
  if (!mainWindow) return;
  const { width, height } = mainWindow.getContentBounds();
  view.setBounds({
    x: 0,
    y: TOPBAR_HEIGHT,
    width,
    height: Math.max(0, height - TOPBAR_HEIGHT),
  });
}

function enviarParaRenderer(canal, dados) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(canal, dados);
  }
}

// ═══════════════════════════════════════════════════════════════════
// Gerenciamento de abas
// ═══════════════════════════════════════════════════════════════════
function criarAba(urlInicial = HOME_URL, ativar = true) {
  const id = proximoAbaId++;

  const view = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: 'persist:ls-trainer',
    },
  });

  const aba = {
    id,
    view,
    titulo: 'LS Trainer',
    url: urlInicial,
    carregando: false,
  };
  abas.set(id, aba);

  const wc = view.webContents;

  wc.on('page-title-updated', (_, titulo) => {
    aba.titulo = titulo;
    enviarParaRenderer('aba-atualizada', {
      id, titulo, url: wc.getURL(), carregando: aba.carregando,
    });
  });

  wc.on('did-start-loading', () => {
    aba.carregando = true;
    enviarParaRenderer('aba-atualizada', {
      id, titulo: aba.titulo, url: wc.getURL(), carregando: true,
    });
  });

  wc.on('did-stop-loading', () => {
    aba.carregando = false;
    aba.url = wc.getURL();
    enviarParaRenderer('aba-atualizada', {
      id, titulo: aba.titulo, url: aba.url, carregando: false,
    });
  });

  wc.on('did-navigate', (_, navUrl) => {
    aba.url = navUrl;
    enviarParaRenderer('aba-atualizada', {
      id, titulo: aba.titulo, url: navUrl, carregando: aba.carregando,
    });
  });

  wc.on('did-navigate-in-page', (_, navUrl) => {
    aba.url = navUrl;
    enviarParaRenderer('aba-atualizada', {
      id, titulo: aba.titulo, url: navUrl, carregando: aba.carregando,
    });
  });

  wc.on('page-favicon-updated', (_, favicons) => {
    if (favicons && favicons.length > 0) {
      enviarParaRenderer('aba-favicon', { id, favicon: favicons[0] });
    }
  });

  wc.setWindowOpenHandler(({ url }) => {
    criarAba(url, true);
    return { action: 'deny' };
  });

  wc.on('will-navigate', (event, navUrl) => {
    console.log(`🔵 [aba ${id}] will-navigate:`, navUrl);
  });

  wc.loadURL(urlInicial);

  enviarParaRenderer('aba-criada', {
    id, titulo: aba.titulo, url: urlInicial, carregando: true,
  });

  if (ativar) ativarAba(id);

  return id;
}

function ativarAba(id) {
  const aba = abas.get(id);
  if (!aba) return;

  for (const [outraId, outraAba] of abas) {
    if (outraId !== id) {
      try { mainWindow.contentView.removeChildView(outraAba.view); } catch (e) {}
    }
  }

  try {
    mainWindow.contentView.addChildView(aba.view);
  } catch (e) {}
  atualizarLimitesView(aba.view);

  abaAtivaId = id;
  enviarParaRenderer('aba-ativa', { id });
  mainWindow.setTitle(`${aba.titulo} — LS Trainer`);
}

function fecharAba(id) {
  const aba = abas.get(id);
  if (!aba) return;

  try { mainWindow.contentView.removeChildView(aba.view); } catch (e) {}
  try { aba.view.webContents.close(); } catch (e) {}
  abas.delete(id);

  enviarParaRenderer('aba-fechada', { id });

  if (abaAtivaId === id) {
    const restantes = [...abas.keys()];
    if (restantes.length > 0) {
      ativarAba(restantes[restantes.length - 1]);
    } else {
      criarAba(HOME_URL, true);
    }
  }
}

function navegarAbaAtiva(url) {
  const aba = abas.get(abaAtivaId);
  if (!aba) return;
  aba.view.webContents.loadURL(url);
}

// ═══════════════════════════════════════════════════════════════════
// Janela principal
// ═══════════════════════════════════════════════════════════════════
function criarJanela() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'LS Trainer',
    backgroundColor: '#1e1e2e',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile('renderer/index.html');
  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('resize', () => {
    const aba = abas.get(abaAtivaId);
    if (aba) atualizarLimitesView(aba.view);
  });

  mainWindow.on('closed', () => {
    for (const [, aba] of abas) {
      try { aba.view.webContents.close(); } catch (e) {}
    }
    abas.clear();
    mainWindow = null;
  });

  mainWindow.webContents.once('did-finish-load', () => {
    criarAba(HOME_URL, true);
  });
}

// ═══════════════════════════════════════════════════════════════════
// IPC
// ═══════════════════════════════════════════════════════════════════
ipcMain.handle('navegar', (_, url) => {
  if (url) navegarAbaAtiva(url);
  return { ok: !!url };
});

ipcMain.handle('nova-aba', () => {
  // Sempre abre uma nova aba no LS Trainer
  return criarAba(HOME_URL, true);
});

ipcMain.handle('fechar-aba', (_, id) => {
  fecharAba(id);
  return { ok: true };
});

ipcMain.handle('ativar-aba', (_, id) => {
  ativarAba(id);
  return { ok: true };
});

ipcMain.handle('voltar', () => {
  const aba = abas.get(abaAtivaId);
  if (aba && aba.view.webContents.canGoBack()) aba.view.webContents.goBack();
});

ipcMain.handle('avancar', () => {
  const aba = abas.get(abaAtivaId);
  if (aba && aba.view.webContents.canGoForward()) aba.view.webContents.goForward();
});

ipcMain.handle('recarregar', () => {
  const aba = abas.get(abaAtivaId);
  if (aba) aba.view.webContents.reload();
});

ipcMain.handle('home', () => {
  navegarAbaAtiva(HOME_URL);
});

ipcMain.handle('devtools', () => {
  const aba = abas.get(abaAtivaId);
  if (aba) aba.view.webContents.openDevTools({ mode: 'detach' });
});

// ═══════════════════════════════════════════════════════════════════
// Ciclo de vida
// ═══════════════════════════════════════════════════════════════════
app.whenReady().then(() => {
  session.fromPartition('persist:ls-trainer')
    .setPermissionRequestHandler((wc, permission, callback) => {
      callback(['notifications', 'clipboard-read', 'clipboard-sanitized-write', 'media']
        .includes(permission));
    });

  criarJanela();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) criarJanela();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});