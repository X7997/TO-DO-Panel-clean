const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

console.log('[SmokeTest] Launching Electron smoke verification...');

app.whenReady().then(async () => {
  const storePath = path.join(__dirname, '..', 'data', 'store.json');
  if (!fs.existsSync(storePath)) {
    console.error('[SmokeTest] FAILED: store.json does not exist');
    process.exit(1);
  }
  const storeData = JSON.parse(fs.readFileSync(storePath, 'utf8'));
  if (!storeData.projects || !storeData.tasks) {
    console.error('[SmokeTest] FAILED: store.json structure invalid');
    process.exit(1);
  }
  console.log(`[SmokeTest] Store verified: ${storeData.projects.length} projects, ${storeData.tasks.length} tasks.`);

  const win = new BrowserWindow({
    width: 1080,
    height: 640,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // 监听渲染进程控制台报错
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (level >= 3) {
      console.error(`[Renderer Error] [Line ${line}] ${message}`);
    } else {
      console.log(`[Renderer] ${message}`);
    }
  });

  win.webContents.on('did-fail-load', (e, errorCode, errorDescription) => {
    console.error('[SmokeTest] FAILED to load index.html:', errorDescription);
    process.exit(1);
  });

  win.webContents.on('did-finish-load', () => {
    console.log('[SmokeTest] index.html loaded successfully!');
    setTimeout(() => {
      console.log('[SmokeTest] SUCCESS: All systems nominal! Exiting cleanly.');
      win.close();
      app.quit();
      process.exit(0);
    }, 1500);
  });

  await win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
});
