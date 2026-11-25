const { app, BrowserWindow, WebContentsView, ipcMain, session } = require('electron');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════
// Configuração
// ═══════════════════════════════════════════════════════════════════
const HOME_URL = 'https://ls-trainer.vercel.app';
// ⚠️ Reduzido de 96 para 40 para comportar apenas a barra fina com o botão
const TOPBAR_HEIGHT = 40;

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

// ═══════════════════════════════════════════════════════════════════
// Gerenciamento de abas (simplificado)
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

  view.webContents.setWindowOpenHandler(({ url }) => {
    view.webContents.loadURL(url);
    return { action: 'deny' };
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
    criarAba(HOME_URL);
  });
}

// ═══════════════════════════════════════════════════════════════════
// IPC (apenas devtools agora)
// ═══════════════════════════════════════════════════════════════════
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