const { app, BrowserWindow, WebContentsView, ipcMain, session, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════
// Configuração
// ═══════════════════════════════════════════════════════════════════
const HOME_URL = 'https://ls-trainer.vercel.app';
const TOPBAR_HEIGHT = 40;

// Caminhos dos ícones
const ICON_PATH = path.join(__dirname, 'images', 'icon.png');

let mainWindow = null;
let splashWindow = null;
let tray = null;
let abaAtivaId = null;
let proximoAbaId = 1;
const abas = new Map();

let isQuiting = false;

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

// ═══════════════════════════════════════════════════════════════════
// Gerenciamento de abas
// ═══════════════════════════════════════════════════════════════════
function criarAba(urlInicial = HOME_URL) {
  const id = proximoAbaId++;
  const view = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: 'persist:ls-trainer',
    },
  });

  const aba = { id, view };
  abas.set(id, aba);

  view.webContents.loadURL(urlInicial);

  // Fecha a splash screen assim que o site carregar
  view.webContents.on('did-finish-load', () => {
    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
      mainWindow.show();
    }
  });

  view.webContents.on('did-fail-load', () => {
    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
      mainWindow.show();
    }
  });

  view.webContents.setWindowOpenHandler(({ url }) => {
    view.webContents.loadURL(url);
    return { action: 'deny' };
  });

  // Atalhos (F5, Zoom, F11)
  view.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F5' || (input.control && input.key === 'r')) {
      view.webContents.reload();
      event.preventDefault();
    }
    if (input.control && (input.key === '+' || input.key === '=')) {
      view.webContents.setZoomLevel(view.webContents.getZoomLevel() + 0.5);
      event.preventDefault();
    }
    if (input.control && input.key === '-') {
      view.webContents.setZoomLevel(view.webContents.getZoomLevel() - 0.5);
      event.preventDefault();
    }
    if (input.control && input.key === '0') {
      view.webContents.setZoomLevel(0);
      event.preventDefault();
    }
    if (input.key === 'F11') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }
  });

  view.webContents.on('destroyed', () => {
    abas.delete(id);
  });

  if (!abaAtivaId) {
    ativarAba(id);
  }
  return id;
}

function ativarAba(id) {
  const aba = abas.get(id);
  if (!aba) return;
  mainWindow.contentView.addChildView(aba.view);
  atualizarLimitesView(aba.view);
  abaAtivaId = id;
  mainWindow.setTitle('LS Trainer');
}

// ═══════════════════════════════════════════════════════════════════
// Splash Screen & Janela Principal
// ═══════════════════════════════════════════════════════════════════
function criarSplash() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 400,
    transparent: false,
    frame: false,
    alwaysOnTop: true,
    backgroundColor: '#1e1e2e',
    icon: ICON_PATH, // Usa o ícone do app
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });

  splashWindow.loadFile('renderer/splash.html');
}

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
    icon: ICON_PATH, // Usa o ícone do app
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile('renderer/index.html');

  mainWindow.webContents.once('did-finish-load', () => {
    criarAba(HOME_URL);
  });

  mainWindow.on('resize', () => {
    const aba = abas.get(abaAtivaId);
    if (aba) atualizarLimitesView(aba.view);
  });

  // Intercepta o fechamento para esconder no Tray
  mainWindow.on('close', (event) => {
    if (!isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    for (const [, aba] of abas) {
      try { aba.view.webContents.close(); } catch (e) {}
    }
    abas.clear();
    mainWindow = null;
  });
}

// ═══════════════════════════════════════════════════════════════════
// Bandeja do Sistema (Tray)
// ═══════════════════════════════════════════════════════════════════
function criarTray() {
  try {
    let icon = nativeImage.createFromPath(ICON_PATH);
    
    if (icon.isEmpty()) {
      console.warn('⚠️ Ícone do Tray não encontrado em:', ICON_PATH);
    } else {
      // ⚠️ REDIMENSIONAMENTO ADEQUADO PARA O WINDOWS
      // Força o ícone a ser 16x16 com a melhor qualidade possível.
      // Isso evita que o Windows "espante" ou distorça a imagem.
      icon = icon.resize({ width: 16, height: 16, quality: 'best' });
    }

    tray = new Tray(icon);
    tray.setToolTip('LS Trainer - Aberto');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Abrir LS Trainer',
        click: () => {
          mainWindow.show();
          mainWindow.focus();
        }
      },
      { type: 'separator' },
      {
        label: 'Sair',
        click: () => {
          isQuiting = true;
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (error) {
    console.error('Erro ao criar o Tray:', error);
  }
}

// ═══════════════════════════════════════════════════════════════════
// IPC
// ═══════════════════════════════════════════════════════════════════
ipcMain.handle('devtools', () => {
  const aba = abas.get(abaAtivaId);
  if (aba) aba.view.webContents.openDevTools({ mode: 'detach' });
});

// ═══════════════════════════════════════════════════════════════════
// Ciclo de vida
// ═══════════════════════════════════════════════════════════════════
app.whenReady().then(() => {
  // Força o Windows a usar o ícone personalizado na barra de tarefas
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.lstrainer.desktop');
  }

  session.fromPartition('persist:ls-trainer')
    .setPermissionRequestHandler((wc, permission, callback) => {
      callback(['notifications', 'clipboard-read', 'clipboard-sanitized-write', 'media']
        .includes(permission));
    });

  app.setLoginItemSettings({
    openAtLogin: true,
    path: app.getPath('exe')
  });

  criarSplash();
  criarJanela();
  criarTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) criarJanela();
  });
});

app.on('before-quit', () => {
  isQuiting = true;
});

app.on('will-quit', () => {
  // globalShortcut.unregisterAll(); 
});