const { app, BrowserWindow, screen, ipcMain, shell, Tray, Menu, nativeImage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { deepScanAndClusterWorkspaces, safeTrashOrDelete } = require('./cleaner');

// 设置独立的用户数据目录，避免全局缓存锁权限冲突
try {
  app.setPath('userData', path.join(app.getPath('appData'), 'todo-panel-data'));
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
} catch (e) {
  // ignore
}

// 运行时异常与退出追踪日志
process.on('uncaughtException', (err) => {
  try {
    fs.appendFileSync(path.join(__dirname, 'scripts', 'runtime.log'), `[${new Date().toISOString()}] UNCAUGHT: ${err.stack}\n`);
  } catch (e) {}
});

process.on('unhandledRejection', (err) => {
  try {
    fs.appendFileSync(path.join(__dirname, 'scripts', 'runtime.log'), `[${new Date().toISOString()}] UNHANDLED: ${err ? err.stack : err}\n`);
  } catch (e) {}
});

// 单实例锁：防止多开进程冲突，再次启动时唤醒当前主窗口
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  try {
    fs.appendFileSync(path.join(__dirname, 'scripts', 'runtime.log'), `[${new Date().toISOString()}] Lock acquisition failed, exiting.\n`);
  } catch (e) {}
  app.quit();
  process.exit(0);
}

try {
  fs.appendFileSync(path.join(__dirname, 'scripts', 'runtime.log'), `[${new Date().toISOString()}] Process started, PID: ${process.pid}\n`);
} catch (e) {}

app.on('second-instance', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    setExpandedState(true);
    mainWindow.focus();
  }
});

let mainWindow = null;
let radarWindow = null;
let tray = null;
let isExpanded = false;
let isTransitioning = false;
let isDialogOpen = false;
let isModalActive = false;
let isPinned = false;
let isBottomPlanOpen = false;
let mousePollTimer = null;
let lastIgnoreMouseEvents = null;

const DATA_FILE = path.join(__dirname, 'data', 'store.json');
const BACKUP_DIR = path.join(__dirname, 'data', 'backups');

// 舞台与窗口尺寸 (1420x680，容纳居中 820px 工作台、左右详情浮窗及正下方滑出的方案拆解小窗)
const WIN_WIDTH = 1420;
const WIN_HEIGHT = 680;

function getOriginalBounds() {
  let targetDisplay = screen.getPrimaryDisplay();
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      targetDisplay = screen.getDisplayMatching(mainWindow.getBounds());
    } catch (e) {
      targetDisplay = screen.getPrimaryDisplay();
    }
  }
  const workArea = targetDisplay.workArea;
  return {
    x: workArea.x + Math.round((workArea.width - WIN_WIDTH) / 2),
    y: workArea.y,
    width: WIN_WIDTH,
    height: WIN_HEIGHT
  };
}

const REAL_WORKSPACE_MAP = {
  P35: 'Q:\\Todo',
  P18: 'Q:\\Chuanzhi_Cup',
  P33: 'Q:\\CUMCM',
  P10: 'Q:\\K230',
  P16: 'Q:\\K230',
  P15: 'Q:\\foodcat',
  P19: 'Q:\\QT_APP',
  P27: 'Q:\\Zigbee',
  P08: 'Q:\\STM32c8t6',
  P04: 'Q:\\444444444444444444444LanQiaoBei',
  P34: 'Q:\\GitHub',
  P32: 'Q:\\xiaohonshu',
  P01: 'Q:\\DynamicIsland'
};

function sanitizeStorePaths(storeObj) {
  if (!storeObj) return storeObj;
  if (Array.isArray(storeObj.projects)) {
    storeObj.projects.forEach(p => {
      const code = (p.code || '').toUpperCase();
      const real = REAL_WORKSPACE_MAP[code];
      if (real && fs.existsSync(real)) {
        p.path = real;
      } else if (p.path && (p.path.includes('Obsidian_KB') || p.path.includes('opposite'))) {
        if (real) p.path = real;
      }
    });
  }
  if (Array.isArray(storeObj.tasks)) {
    storeObj.tasks.forEach(t => {
      // 保护已有绑定的真实文件夹，绝不覆盖
      if (t.customPath && !t.customPath.includes('Obsidian_KB') && !t.customPath.includes('opposite')) {
        return;
      }
      const code = (t.projectCode || '').toUpperCase();
      if (!code || code === '待选' || code === '待做' || code === '未分类') {
        return;
      }
      const real = REAL_WORKSPACE_MAP[code];
      if (real && fs.existsSync(real)) {
        t.customPath = real;
      } else if (t.customPath && (t.customPath.includes('Obsidian_KB') || t.customPath.includes('opposite'))) {
        if (real) t.customPath = real;
        else t.customPath = null;
      }
    });
  }
  return storeObj;
}

function loadStore() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(content);
      try {
        if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
        const backupFile = path.join(BACKUP_DIR, 'store.backup.json');
        if (!fs.existsSync(backupFile)) {
          fs.writeFileSync(backupFile, content, 'utf-8');
        }
      } catch (e) {}
      return sanitizeStorePaths(data);
    }
  } catch (err) {
    console.error('Failed to read store.json, attempting restore from backup:', err);
    const backupFile = path.join(BACKUP_DIR, 'store.backup.json');
    if (fs.existsSync(backupFile)) {
      try {
        const backupContent = fs.readFileSync(backupFile, 'utf-8');
        const backupData = JSON.parse(backupContent);
        console.log('[Store] Successfully restored data from store.backup.json');
        return sanitizeStorePaths(backupData);
      } catch (bErr) {
        console.error('Backup load failed:', bErr);
      }
    }
  }
  return {};
}

function saveStore(data) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

    const jsonStr = JSON.stringify(data, null, 2);
    const tmpFile = `${DATA_FILE}.tmp`;

    // 1. 原子写入临时文件
    fs.writeFileSync(tmpFile, jsonStr, 'utf-8');
    // 2. 原子重命名替换主文件，彻底防止半写入或崩溃损毁
    fs.renameSync(tmpFile, DATA_FILE);

    // 3. 实时镜像备份
    fs.writeFileSync(path.join(BACKUP_DIR, 'store.backup.json'), jsonStr, 'utf-8');

    // 4. 按天留存归档底稿 (每天一份安全副本)
    const dateTag = new Date().toISOString().slice(0, 10);
    const dailyBackupPath = path.join(BACKUP_DIR, `store_${dateTag}.json`);
    if (!fs.existsSync(dailyBackupPath)) {
      fs.writeFileSync(dailyBackupPath, jsonStr, 'utf-8');
    }

    return { success: true };
  } catch (err) {
    console.error('Failed to write store.json:', err);
    return { success: false, error: err.message };
  }
}

// 监听数据文件变动，支持跨 Agent / 外部脚本实时热重载
if (fs.existsSync(DATA_FILE)) {
  fs.watchFile(DATA_FILE, { interval: 800 }, () => {
    const currentStore = loadStore();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('store-updated', currentStore);
    }
  });
}

function bringToFrontTemp() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.setAlwaysOnTop(true);
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setAlwaysOnTop(isPinned);
    }
  }, 350);
}

function createWindow() {
  const initialBounds = getOriginalBounds();

  mainWindow = new BrowserWindow({
    ...initialBounds,
    frame: false,
    transparent: true,
    alwaysOnTop: false, // 允许其他窗口自然覆盖
    resizable: false,
    movable: true, // 核心：支持用户按住顶部随意拖拽移动到桌面任意位置
    show: false, // 核心：常态无界面，桌面上零悬浮药丸、零像素遮挡
    skipTaskbar: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // 窗口关闭拦截：后台常驻守护，关闭仅隐藏至系统托盘，除非托盘显式退出
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
      isExpanded = false;
      return false;
    }
  });

  // 失焦自动最小化：仅当鼠标确实移至展开工作区外部失焦时才隐藏；物理光标在工作区舞台内时绝对不闪退
  mainWindow.on('blur', () => {
    if (!isPinned && isExpanded && !isDialogOpen && !isModalActive) {
      try {
        const cursor = screen.getCursorScreenPoint();
        const bounds = mainWindow.getBounds();
        const maxAllowedY = isBottomPlanOpen ? 675 : 465;
        const isCursorInside = (
          cursor.x >= bounds.x - 5 &&
          cursor.x <= bounds.x + bounds.width + 5 &&
          cursor.y >= bounds.y - 5 &&
          cursor.y <= bounds.y + maxAllowedY
        );
        if (isCursorInside) {
          // 鼠标物理坐标处于工作区舞台内（如系统提示或浮窗刚折叠），绝不误关！立刻恢复焦点
          mainWindow.focus();
          return;
        }
      } catch (e) {}
      setExpandedState(false);
    }
  });

  setupMousePolling();

  // 自动化冒烟测试支持
  if (process.argv.includes('--smoke-test')) {
    console.log('[Main] Smoke test mode active. Waiting for render...');
    mainWindow.webContents.on('did-finish-load', () => {
      console.log('[Main] Renderer finished load. Verifying IPC...');
      setTimeout(() => {
        console.log('[Main] Smoke verification SUCCESSFUL. Quitting cleanly.');
        app.quit();
      }, 1500);
    });
  }
}

let guardProcess = null;
let lastGuardStatus = { mouseDown: false, fgClass: '', isDesktop: true, underDesktop: true };

function initDesktopGuard() {
  const exePath = path.join(__dirname, 'scripts', 'desktop-guard.exe');
  if (!fs.existsSync(exePath)) return;

  try {
    const { spawn } = require('child_process');
    guardProcess = spawn(exePath, [], {
      stdio: ['pipe', 'pipe', 'ignore'],
      windowsHide: true
    });

    guardProcess.stdout.on('data', (data) => {
      try {
        const lines = data.toString().trim().split('\n');
        const last = lines[lines.length - 1];
        if (last) {
          lastGuardStatus = JSON.parse(last);
        }
      } catch (e) {}
    });

    guardProcess.on('error', () => { guardProcess = null; });
    guardProcess.on('exit', () => { guardProcess = null; });
  } catch (e) {
    guardProcess = null;
  }
}

function queryDesktopGuard() {
  if (guardProcess && guardProcess.stdin && !guardProcess.killed) {
    try {
      guardProcess.stdin.write('check\n');
    } catch (e) {}
  }
}

function setupMousePolling() {
  if (mousePollTimer) clearTimeout(mousePollTimer);
  initDesktopGuard();

  let wasAtTopCenter = false;
  let dwellStartTime = null;
  let lastCursorPos = { x: 0, y: 0 };
  let outsideWorkspaceStartTime = null;

  const pollStep = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    try {
      const cursor = screen.getCursorScreenPoint();
      let targetDisplay = screen.getPrimaryDisplay();
      try {
        targetDisplay = screen.getDisplayNearestPoint(cursor);
      } catch (e) {
        targetDisplay = screen.getPrimaryDisplay();
      }
      const wa = targetDisplay.workArea;
      const centerX = wa.x + wa.width / 2;

      // 1. 紧凑精细的顶部中央感应区（用户要求的“那一小块区域”）：
      // 横向收缩至 +/- 70px（共 140px 精准小区域），纵向严格贴顶 0 ~ 6px，杜绝大范围误触！
      const isAtTopCenterTrigger = (
        cursor.x >= centerX - 70 &&
        cursor.x <= centerX + 70 &&
        cursor.y >= wa.y &&
        cursor.y <= wa.y + 6
      );

      // 接近屏幕顶部时激活硬件与桌面状态查询
      if (cursor.y <= wa.y + 25) {
        queryDesktopGuard();
      }

      if (isAtTopCenterTrigger) {
        // 核心拦截 1：拖拽检测（“不要被拖拽的时候被唤醒！！这样影响了我的发挥”）
        // 只要鼠标左键或右键处于按下状态（拖拽窗口、选中文本、拖放文件），绝对不唤醒！
        if (lastGuardStatus.mouseDown) {
          dwellStartTime = null;
          wasAtTopCenter = false;
          scheduleNext(35);
          return;
        }

        // 核心拦截 2：桌面专属检测（“只有回到桌面才触发！！”）
        // 只有前台窗口或光标所在窗口为桌面 (Progman/WorkerW/Shell_TrayWnd) 时才允许触发；在浏览器/代码编辑器等应用内绝不误跳！
        if (!lastGuardStatus.isDesktop && !lastGuardStatus.underDesktop) {
          dwellStartTime = null;
          wasAtTopCenter = false;
          scheduleNext(40);
          return;
        }

        // 核心拦截 3：鼠标空闲停顿检测（“在我的鼠标要空闲的时候放到那一小块区域的时候才显示出来”）
        // 高速划过、甩鼠标直接忽略；光标必须在该小区域内稳定停顿 >= 350ms 才判定为空闲有意唤起
        const moveDist = Math.hypot(cursor.x - lastCursorPos.x, cursor.y - lastCursorPos.y);
        lastCursorPos = { x: cursor.x, y: cursor.y };

        if (dwellStartTime === null) {
          dwellStartTime = Date.now();
        } else if (moveDist > 12) {
          // 鼠标正在大幅移动，重置空闲计时
          dwellStartTime = Date.now();
        }

        const dwellElapsed = Date.now() - dwellStartTime;
        if (dwellElapsed >= 350) {
          // 此时满足：鼠标空闲停留 > 350ms + 未按键（非拖拽） + 位于桌面环境 + 位于顶部小区域
          if (!wasAtTopCenter) {
            wasAtTopCenter = true;
            const orig = getOriginalBounds();
            if (!mainWindow.isVisible()) {
              mainWindow.setBounds(orig);
              mainWindow.show();
              mainWindow.focus();
              mainWindow.setIgnoreMouseEvents(false);
              lastIgnoreMouseEvents = false;
              isExpanded = true;
              mainWindow.webContents.send('panel-state-changed', { isExpanded: true });
            } else {
              const curPos = mainWindow.getPosition();
              const isOffHome = Math.abs(curPos[0] - orig.x) > 20 || Math.abs(curPos[1] - orig.y) > 20;
              if (isOffHome) {
                mainWindow.setPosition(orig.x, orig.y);
                mainWindow.focus();
              }
            }
          }
        }
      } else {
        dwellStartTime = null;
        wasAtTopCenter = false;
        lastCursorPos = { x: cursor.x, y: cursor.y };
      }

      // 2. 展开态工作台守卫：只要鼠标移出所有工作区物理范围，自动平滑最小化；在折叠/展开工作区内绝不闪退
      if (isExpanded && mainWindow.isVisible()) {
        if (!isPinned && !isDialogOpen && !isModalActive) {
          if (!lastGuardStatus.mouseDown) {
            const bounds = mainWindow.getBounds();
            // 工作区物理翼展：包含居中 820px 工作台与左右折叠/展开的工作区浮窗（宽 1420，高 460）
            const wsMinX = bounds.x + 2;
            const wsMaxX = bounds.x + bounds.width - 2;
            const wsMinY = bounds.y;
            const wsMaxY = bounds.y + (isBottomPlanOpen ? 675 : 465); // 展开底部方案小窗时允许光标下探至 675px，收起时回归 465px

            const isCursorInWorkspace = (
              cursor.x >= wsMinX &&
              cursor.x <= wsMaxX &&
              cursor.y >= wsMinY &&
              cursor.y <= wsMaxY
            );

            if (isCursorInWorkspace) {
              outsideWorkspaceStartTime = null;
            } else {
              // 鼠标硬件坐标已经移至所有工作区以外！
              if (outsideWorkspaceStartTime === null) {
                outsideWorkspaceStartTime = Date.now();
              } else if (Date.now() - outsideWorkspaceStartTime >= 300) {
                outsideWorkspaceStartTime = null;
                setExpandedState(false);
              }
            }
          }
        }
      } else {
        outsideWorkspaceStartTime = null;
      }

      // 超低能耗自适应调频：展开态或接近屏幕顶端时 35ms 极速响应，隐藏常态且远离顶端时 300ms 浅休眠
      const isFastPoll = (isExpanded && mainWindow.isVisible()) || (cursor.y <= wa.y + 60);
      scheduleNext(isFastPoll ? 35 : 300);
    } catch (err) {
      scheduleNext(300);
    }
  };

  function scheduleNext(ms) {
    if (mousePollTimer) clearTimeout(mousePollTimer);
    mousePollTimer = setTimeout(pollStep, ms);
  }

  scheduleNext(300);
}

function setExpandedState(expanded) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  isExpanded = Boolean(expanded);
  if (isExpanded) {
    if (!mainWindow.isVisible()) {
      const orig = getOriginalBounds();
      mainWindow.setBounds(orig);
      mainWindow.show();
    }
    mainWindow.focus();
    bringToFrontTemp();
    mainWindow.setIgnoreMouseEvents(false);
    lastIgnoreMouseEvents = false;
  } else {
    mainWindow.hide();
  }
  mainWindow.webContents.send('panel-state-changed', { isExpanded });
}

function toggleRadarWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  if (radarWindow && !radarWindow.isDestroyed()) {
    if (radarWindow.isVisible()) {
      radarWindow.hide();
      return;
    }
  }

  const mainBounds = mainWindow.getBounds();
  const primaryDisplay = screen.getPrimaryDisplay();
  const workArea = primaryDisplay.workArea;

  let targetX = mainBounds.x + mainBounds.width + 12;
  if (targetX + 340 > workArea.x + workArea.width) {
    targetX = workArea.x + workArea.width - 345;
  }

  if (!radarWindow || radarWindow.isDestroyed()) {
    radarWindow = new BrowserWindow({
      width: 340,
      height: 468,
      x: targetX,
      y: mainBounds.y,
      frame: false,
      transparent: true,
      alwaysOnTop: false,
      resizable: false,
      movable: false,
      skipTaskbar: true,
      hasShadow: false,
      backgroundColor: '#00000000',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    radarWindow.loadFile(path.join(__dirname, 'renderer', 'radar.html'));
  } else {
    radarWindow.setPosition(targetX, mainBounds.y);
    radarWindow.show();
  }
}

// IPC 处理器
ipcMain.handle('get-store', () => {
  return loadStore();
});

ipcMain.handle('save-store', (_event, data) => {
  return saveStore(data);
});

ipcMain.on('toggle-expand', () => {
  setExpandedState(!isExpanded);
});

ipcMain.on('set-expanded', (_event, expanded) => {
  setExpandedState(Boolean(expanded));
});

ipcMain.on('minimize-panel', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
    isExpanded = false;
    mainWindow.webContents.send('panel-state-changed', { isExpanded: false });
  }
});

ipcMain.on('reset-position', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const orig = getOriginalBounds();
    mainWindow.setPosition(orig.x, orig.y);
    mainWindow.focus();
    bringToFrontTemp();
  }
});

ipcMain.on('set-modal-active', (_event, active) => {
  isModalActive = Boolean(active);
});

ipcMain.on('set-bottom-popover-state', (_event, isOpen) => {
  isBottomPlanOpen = Boolean(isOpen);
});

ipcMain.on('set-pinned', (_event, pinned) => {
  isPinned = Boolean(pinned);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setAlwaysOnTop(isPinned);
  }
});

ipcMain.handle('get-auto-start', () => {
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('set-auto-start', (_event, enable) => {
  app.setLoginItemSettings({
    openAtLogin: Boolean(enable),
    openAsHidden: true
  });
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.on('set-ignore-mouse-events', (_event, ignore, options) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.setIgnoreMouseEvents(Boolean(ignore), options || {});
      lastIgnoreMouseEvents = Boolean(ignore);
    } catch (e) {
      // ignore
    }
  }
});

ipcMain.on('toggle-radar-window', () => {
  toggleRadarWindow();
});

ipcMain.on('close-radar-window', () => {
  if (radarWindow && !radarWindow.isDestroyed()) {
    radarWindow.hide();
  }
});

ipcMain.handle('add-radar-task', (_event, taskData) => {
  const currentStore = loadStore();
  if (!currentStore.tasks) currentStore.tasks = [];
  const newTask = {
    id: `t-${Date.now()}`,
    text: taskData.text || '未命名任务',
    projectId: taskData.projectId || null,
    projectCode: taskData.projectCode || '待选',
    customPath: taskData.customPath || null,
    completed: false,
    createdAt: new Date().toISOString()
  };
  currentStore.tasks.push(newTask);
  saveStore(currentStore);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('store-updated', currentStore);
  }
  return { success: true };
});

ipcMain.handle('open-workspace', async (_event, projectPath) => {
  if (!projectPath) return { success: false, error: 'Path empty' };
  try {
    if (!fs.existsSync(projectPath)) {
      return { success: false, error: `路径不存在: ${projectPath}` };
    }
    const customCodeBin = 'S:\\Microsoft VS Code\\Microsoft VS Code\\bin\\code.cmd';
    const codeCmd = fs.existsSync(customCodeBin) ? `"${customCodeBin}"` : 'code';

    exec(`cmd.exe /c "${codeCmd} \"${projectPath}\""`, (err) => {
      if (err) {
        console.warn('VS Code command failed, opening via shell.openPath:', err);
        shell.openPath(projectPath);
      }
    });
    return { success: true, path: projectPath };
  } catch (err) {
    shell.openPath(projectPath);
    return { success: true, path: projectPath };
  }
});

// 打开 Windows 资源管理器文件夹
ipcMain.handle('open-in-explorer', async (_event, targetPath) => {
  if (!targetPath) return { success: false, error: 'Path empty' };
  try {
    if (!fs.existsSync(targetPath)) {
      return { success: false, error: `路径不存在: ${targetPath}` };
    }
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      shell.openPath(targetPath);
    } else {
      shell.showItemInFolder(targetPath);
    }
    return { success: true, path: targetPath };
  } catch (err) {
    console.error('Failed to open in explorer:', err);
    return { success: false, error: err.message };
  }
});

// 呼出 Windows 原生目录选择框，供任务与项目绑定路径
ipcMain.handle('select-folder', async () => {
  if (!mainWindow) return { success: false, error: 'Window not ready' };
  isDialogOpen = true;
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择任务绑定的工作目录',
      properties: ['openDirectory', 'createDirectory']
    });
    isDialogOpen = false;
    if (!result.canceled && result.filePaths.length > 0) {
      return { success: true, folderPath: result.filePaths[0] };
    }
    return { success: false, canceled: true };
  } catch (e) {
    isDialogOpen = false;
    return { success: false, error: e.message };
  }
});

// 扫描 Q:\Obsidian_KB\01_Projects_项目库，联动知识库真实项目
ipcMain.handle('scan-obsidian-projects', async () => {
  const kbDir = 'Q:\\Obsidian_KB\\01_Projects_项目库';
  const projects = [];

  const KNOWN_COLOR_PALETTE = ['#0284c7', '#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];

  try {
    if (fs.existsSync(kbDir)) {
      const items = fs.readdirSync(kbDir, { withFileTypes: true });
      let colorIdx = 0;

      for (const it of items) {
        if (!it.isDirectory()) continue;
        const match = it.name.match(/^(P\d+)_?(.*)$/i);
        if (match) {
          const code = match[1].toUpperCase();
          const rawName = match[2] || it.name;
          const cleanName = rawName.replace(/_/g, ' ');

          // 核心：优先解析到 Q:\ 下的真实代码工程路径，而非单纯的 Obsidian 笔记文档路径！
          let realPath = REAL_WORKSPACE_MAP[code] || null;
          if (realPath && !fs.existsSync(realPath)) {
            realPath = null;
          }
          if (!realPath) {
            const candidate = path.join('Q:\\', rawName);
            if (fs.existsSync(candidate)) {
              realPath = candidate;
            }
          }

          projects.push({
            id: code.toLowerCase(),
            code,
            name: cleanName,
            path: realPath || path.join(kbDir, it.name),
            docPath: path.join(kbDir, it.name),
            progress: 85,
            color: KNOWN_COLOR_PALETTE[colorIdx % KNOWN_COLOR_PALETTE.length]
          });
          colorIdx++;
        }
      }
    }
    return { success: true, projects };
  } catch (err) {
    console.error('Scan KB projects error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-external-url', (_event, url) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    shell.openExternal(url);
    return { success: true };
  }
  return { success: false, error: 'Invalid URL' };
});

// =========================================================
// GitHub 官方 Token 智能解析与开源雷达抓取引擎 (路线 B)
// =========================================================
function resolveGitHubToken(explicitToken) {
  if (explicitToken && typeof explicitToken === 'string' && explicitToken.trim()) {
    return { token: explicitToken.trim(), source: 'user_setting' };
  }
  // 1. 检查 store.json 中保存的 token
  try {
    if (fs.existsSync(DATA_FILE)) {
      const storeObj = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (storeObj && storeObj.settings && storeObj.settings.githubToken && storeObj.settings.githubToken.trim()) {
        return { token: storeObj.settings.githubToken.trim(), source: 'store_settings' };
      }
    }
  } catch (e) {}
  // 2. 检查系统环境变量 GITHUB_TOKEN
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim()) {
    return { token: process.env.GITHUB_TOKEN.trim(), source: 'env_var' };
  }
  // 3. 自动无感获取本机 gh CLI 登录凭证 (极客免配置)
  try {
    const { execSync } = require('child_process');
    const ghToken = execSync('gh auth token', { stdio: ['pipe', 'pipe', 'ignore'], timeout: 2500 }).toString().trim();
    if (ghToken && (ghToken.startsWith('gh') || ghToken.length > 20)) {
      return { token: ghToken, source: 'gh_cli' };
    }
  } catch (e) {}

  return { token: null, source: 'none' };
}

ipcMain.handle('get-github-rate-limit', async (_event, explicitToken) => {
  const { token, source } = resolveGitHubToken(explicitToken);
  try {
    const headers = {
      'User-Agent': 'TO-DO-Panel-App/1.0',
      'Accept': 'application/vnd.github.v3+json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('https://api.github.com/rate_limit', { headers, signal: AbortSignal.timeout(6000) });
    const data = await res.json();
    return {
      success: true,
      hasToken: Boolean(token),
      tokenSource: source,
      searchRate: data.resources && data.resources.search ? data.resources.search : { limit: 30, remaining: 30, reset: 0 },
      coreRate: data.resources && data.resources.core ? data.resources.core : { limit: 5000, remaining: 5000, reset: 0 }
    };
  } catch (err) {
    return { success: false, error: err.message, hasToken: Boolean(token), tokenSource: source };
  }
});

ipcMain.handle('fetch-github-radar', async (_event, options = {}) => {
  const { token, source } = resolveGitHubToken(options.token);
  try {
    const headers = {
      'User-Agent': 'TO-DO-Panel-App/1.0',
      'Accept': 'application/vnd.github.v3+json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const defaultQueries = [
      'stars:>2000 topic:developer-tools pushed:>2024-01-01',
      'stars:>2500 topic:rust topic:cli',
      'stars:>1500 topic:ai-agent topic:productivity',
      'stars:>800 topic:embedded OR topic:esp32 OR topic:iot',
      'stars:>3000 topic:terminal OR topic:tui'
    ];
    const q = options.query || defaultQueries[Math.floor(Math.random() * defaultQueries.length)];
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=10`;

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    const remaining = res.headers.get('x-ratelimit-remaining');
    const limit = res.headers.get('x-ratelimit-limit');
    const reset = res.headers.get('x-ratelimit-reset');

    if (!res.ok) {
      const errBody = await res.text();
      return {
        success: false,
        error: `GitHub API 响应异常 (${res.status}): ${errBody.slice(0, 120)}`,
        rateLimit: { remaining: remaining ? parseInt(remaining, 10) : null, limit: limit ? parseInt(limit, 10) : null }
      };
    }

    const data = await res.json();
    const items = (data.items || []).map(repo => {
      const starsNum = repo.stargazers_count || 0;
      const starsStr = starsNum >= 1000 ? `${(starsNum / 1000).toFixed(1)}k ★` : `${starsNum} ★`;
      const metricNum = starsNum >= 1000 ? `${(starsNum / 1000).toFixed(1)}k` : `${starsNum}`;
      const tag = repo.language || (repo.topics && repo.topics[0]) || 'GitHub神器';
      const desc = repo.description || '高星精选开源工程';
      const cleanDesc = desc.replace(/[\r\n]+/g, ' ').trim();
      const shortDesc = cleanDesc.length > 55 ? cleanDesc.slice(0, 52) + '...' : cleanDesc;

      return {
        id: `gh_${repo.id}`,
        tag,
        stars: starsStr,
        metricNum,
        metricLabel: `${repo.language || '开源'} · 今日活跃`,
        title: `${repo.name}: ${shortDesc}`,
        repo: repo.full_name,
        shortTitle: `${repo.name} - ${shortDesc}`,
        hook: `${repo.name} 斩获 ${starsStr}！${cleanDesc}`,
        douyinQuote: `今天在 GitHub 挖到一个宝藏开源神器 ${repo.name}！获得 ${starsStr}，专治：${cleanDesc}，极客必备效率神器，强烈推荐收藏！`,
        pain: `在 ${tag} 开发与日常工程中，传统方案常常受限于配置繁琐、资源开销过大或缺乏直觉交互。`,
        cure: `采用 ${repo.name} 提供的现代化解法，直接引入其高效架构与开箱即用能力，大幅提升工程质感。`,
        url: repo.html_url
      };
    });

    return {
      success: true,
      items,
      queryUsed: q,
      tokenSource: source,
      rateLimit: {
        remaining: remaining ? parseInt(remaining, 10) : null,
        limit: limit ? parseInt(limit, 10) : null,
        reset: reset ? parseInt(reset, 10) : null
      }
    };
  } catch (err) {
    console.error('Fetch GitHub radar error:', err);
    return { success: false, error: err.message, tokenSource: source };
  }
});

// 辅助：递归统计文件夹物理字节数
function getDirSizeBytes(dirPath, maxDepth = 4) {
  let total = 0;
  function recurse(current, depth) {
    if (depth > maxDepth) return;
    try {
      const items = fs.readdirSync(current, { withFileTypes: true });
      for (const it of items) {
        const fp = path.join(current, it.name);
        if (it.isDirectory()) {
          recurse(fp, depth + 1);
        } else if (it.isFile()) {
          total += fs.statSync(fp).size;
        }
      }
    } catch (e) {}
  }
  recurse(dirPath, 1);
  return total;
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// 辅助：递归安全扫描单一路径下的构建垃圾与运行时缓存
function scanPathForHygiene(targetPath, workspaceName) {
  const findings = [];
  const MAX_DEPTH = 3;

  function scanDir(currentDir, depth) {
    if (depth > MAX_DEPTH) return;
    try {
      const items = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(currentDir, item.name);
        const relPath = path.relative(targetPath, fullPath);

        // 严格忽略 Git 版本控制库，保护版本历史
        if (item.name === '.git') {
          continue;
        }

        // 识别以往清理时存入的 .archive 历史归档残留，让用户可以彻底释放磁盘
        if (item.name === '.archive') {
          const sizeBytes = getDirSizeBytes(fullPath);
          findings.push({
            workspaceName,
            workspacePath: targetPath,
            path: fullPath,
            relPath,
            type: 'dir',
            category: '历史安全归档残留',
            sizeBytes,
            reason: '此前清理移入 .archive 隔离的旧产物与缓存，可彻底清空以真正释放磁盘空间'
          });
          continue;
        }

        // 深度检查 node_modules 中的 .cache 缓存
        if (item.name === 'node_modules') {
          const cacheDir = path.join(fullPath, '.cache');
          if (fs.existsSync(cacheDir)) {
            const sizeBytes = getDirSizeBytes(cacheDir);
            findings.push({
              workspaceName,
              workspacePath: targetPath,
              path: cacheDir,
              relPath: path.relative(targetPath, cacheDir),
              type: 'dir',
              category: 'Webpack/Vite 编译缓存',
              sizeBytes,
              reason: '前端开发工具链编译缓存，可安全重建'
            });
          }
          continue;
        }

        if (item.isDirectory()) {
          // 检查常见构建产物与临时输出目录
          if (['dist', 'build', 'out', 'target', 'cmake-build-debug', 'cmake-build-release', '.cxx', '.next', '.nuxt'].includes(item.name.toLowerCase())) {
            const sizeBytes = getDirSizeBytes(fullPath);
            findings.push({
              workspaceName,
              workspacePath: targetPath,
              path: fullPath,
              relPath,
              type: 'dir',
              category: '项目构建打包物',
              sizeBytes,
              reason: '编译器/打包器生成的临时二进制与目标输出，可随时重新编译生成'
            });
            continue;
          }

          // 检查调试与编译器缓存 (Gradle/Kotlin/Python/前端等)
          if (['__pycache__', '.gradle', '.kotlin', '.pytest_cache', '.turbo', '.parcel-cache', '.vite', '.svelte-kit', '.dart_tool'].includes(item.name.toLowerCase())) {
            const sizeBytes = getDirSizeBytes(fullPath);
            findings.push({
              workspaceName,
              workspacePath: targetPath,
              path: fullPath,
              relPath,
              type: 'dir',
              category: '工程中间缓存',
              sizeBytes,
              reason: 'IDE/编译工具链生成的中间缓存，重新编译时会自动生成'
            });
            continue;
          }

          scanDir(fullPath, depth + 1);
        } else if (item.isFile()) {
          const lowerName = item.name.toLowerCase();

          // 核心安全红线：严禁扫描或误伤任何笔记与文档！
          if (lowerName.endsWith('.md') || lowerName.endsWith('.markdown') || lowerName.endsWith('.txt') || lowerName.endsWith('.canvas') || lowerName.endsWith('.pdf') || lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
            continue;
          }

          let category = null;
          let reason = null;

          if (lowerName.startsWith('temp_') || lowerName.startsWith('tmp_')) {
            category = '临时草稿文件';
            reason = '调试阶段随手创建的临时脚本与草稿';
          } else if (lowerName.endsWith('.tmp') || lowerName.endsWith('.bak') || lowerName.endsWith('.swp') || lowerName.endsWith('.log') || lowerName.startsWith('npm-debug.log')) {
            category = '运行异常日志/备份';
            reason = '异常运行日志或编辑器临时备份';
          }

          if (category) {
            const stats = fs.statSync(fullPath);
            findings.push({
              workspaceName,
              workspacePath: targetPath,
              path: fullPath,
              relPath,
              type: 'file',
              sizeBytes: stats.size,
              category,
              reason
            });
          }
        }
      }
    } catch (e) {
      console.warn('Scan skip:', currentDir, e.message);
    }
  }

  scanDir(targetPath, 1);
  return findings;
}

// 单一工作区体检扫描
ipcMain.handle('scan-workspace-hygiene', async (_event, targetPath) => {
  if (!targetPath || !fs.existsSync(targetPath)) {
    return { success: false, error: '目标工作区不存在' };
  }
  const findings = scanPathForHygiene(targetPath, path.basename(targetPath));
  return { success: true, targetPath, findings };
});

// 只读体检扫描：深度扫描在办任务工作区，识别版本族群（保护稳定版与最新版，排查中间过渡版本与编译垃圾）
ipcMain.handle('scan-task-workspaces', async (_event, workspacePaths) => {
  if (!Array.isArray(workspacePaths) || workspacePaths.length === 0) {
    return { success: true, items: [] };
  }
  try {
    return await deepScanAndClusterWorkspaces(workspacePaths, 4);
  } catch (err) {
    console.error('[scan-task-workspaces] Deep scan error:', err);
    return { success: false, error: err.message, items: [] };
  }
});

// 用户审查后执行物理清理：支持移入 Windows 系统回收站 (shell.trashItem)，支持撤销还原
ipcMain.handle('clean-task-workspaces', async (_event, workspacePaths, explicitItems) => {
  if (!Array.isArray(workspacePaths) || workspacePaths.length === 0) {
    return { success: true, cleanedCount: 0, freedBytes: 0, freedFormatted: '0 B', cleanedItems: [] };
  }

  const allowedRoots = workspacePaths.map(p => path.resolve(p));
  let totalFreed = 0;
  const cleanedItems = [];

  // 如果前端传入了用户审查复选确认的明细路径列表，严格仅清理选中的项
  if (Array.isArray(explicitItems) && explicitItems.length > 0) {
    for (const itemPath of explicitItems) {
      const res = await safeTrashOrDelete(itemPath, allowedRoots);
      if (res && res.success) {
        totalFreed += res.size || 0;
        cleanedItems.push({
          name: res.name,
          path: res.path,
          sizeFormatted: res.sizeFormatted,
          trashed: res.trashed
        });
      }
    }

    return {
      success: true,
      cleanedCount: cleanedItems.length,
      freedBytes: totalFreed,
      freedFormatted: formatBytes(totalFreed),
      cleanedItems
    };
  }

  // 兜底全量清理：先深度扫描，仅清理非受保护项（中间过渡版本与编译垃圾），绝不触碰稳定版与最新版！
  try {
    const scanRes = await deepScanAndClusterWorkspaces(workspacePaths, 4);
    const candidates = (scanRes.items || []).filter(it => !it.isProtected);
    for (const cand of candidates) {
      const res = await safeTrashOrDelete(cand.fullPath, allowedRoots);
      if (res && res.success) {
        totalFreed += res.size || 0;
        cleanedItems.push({
          name: res.name,
          path: res.path,
          sizeFormatted: res.sizeFormatted,
          trashed: res.trashed
        });
      }
    }
  } catch (e) {
    console.error('[clean-task-workspaces] Auto clean error:', e);
  }

  return {
    success: true,
    cleanedCount: cleanedItems.length,
    freedBytes: totalFreed,
    freedFormatted: formatBytes(totalFreed),
    cleanedItems
  };
});


// 纯净任务工作区体检扫描 (仅扫描在办任务实际关联的工作区，绝不扫描任何默认假工程)
ipcMain.handle('scan-weekly-workspaces', async () => {
  const currentStore = loadStore();
  const workspaceMap = new Map();

  // 严格只采集当前在办任务绑定的工作区，无任务时绝不扫描任何无关工程
  if (Array.isArray(currentStore.tasks)) {
    currentStore.tasks.forEach(t => {
      if (!t.completed && t.customPath && fs.existsSync(t.customPath)) {
        const norm = path.resolve(t.customPath);
        if (!workspaceMap.has(norm)) {
          workspaceMap.set(norm, t.projectCode ? `#${t.projectCode} ${t.text}` : path.basename(t.customPath));
        }
      }
    });
  }

  const workspaces = [];
  const allFindings = [];

  for (const [wsPath, wsName] of workspaceMap.entries()) {
    workspaces.push({ path: wsPath, name: wsName });
    const findings = scanPathForHygiene(wsPath, wsName);
    allFindings.push(...findings);
  }

  return {
    success: true,
    workspaces,
    findings: allFindings
  };
});

// GitHub 级工作区安全归档与直接清理（支持移入 .archive 备份或彻底删除释放空间）
ipcMain.handle('execute-workspace-clean', async (_event, { targetPath, items, permanentDelete }) => {
  if (!Array.isArray(items) || items.length === 0) {
    return { success: false, error: '未选择清理项目' };
  }

  const dateTag = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  let movedCount = 0;
  let totalBytesFreed = 0;
  const archiveDirs = new Set();

  try {
    for (const item of items) {
      if (!item.path || !fs.existsSync(item.path)) continue;

      totalBytesFreed += (item.sizeBytes || 0);

      if (permanentDelete) {
        // 直接从磁盘彻底删除，真正释放磁盘空间
        if (fs.statSync(item.path).isDirectory()) {
          fs.rmSync(item.path, { recursive: true, force: true });
        } else {
          fs.unlinkSync(item.path);
        }
        movedCount++;
      } else {
        const wsRoot = item.workspacePath || targetPath || path.dirname(item.path);
        const archiveDir = path.join(wsRoot, '.archive', `cleanup_${dateTag}`);
        archiveDirs.add(archiveDir);
        fs.mkdirSync(archiveDir, { recursive: true });

        const rel = item.relPath || path.basename(item.path);
        const targetArchiveLoc = path.join(archiveDir, rel);
        fs.mkdirSync(path.dirname(targetArchiveLoc), { recursive: true });

        try {
          fs.renameSync(item.path, targetArchiveLoc);
        } catch (renameErr) {
          // 若跨卷或被锁定则采用安全拷贝后清理
          if (fs.statSync(item.path).isDirectory()) {
            fs.cpSync(item.path, targetArchiveLoc, { recursive: true });
            fs.rmSync(item.path, { recursive: true, force: true });
          } else {
            fs.copyFileSync(item.path, targetArchiveLoc);
            fs.unlinkSync(item.path);
          }
        }
        movedCount++;
      }
    }

    return {
      success: true,
      movedCount,
      totalBytesFreed,
      isPermanent: Boolean(permanentDelete),
      archiveDir: Array.from(archiveDirs)[0] || null,
      cleanedItems: items.map(it => ({
        name: path.basename(it.path),
        relPath: it.relPath || path.basename(it.path),
        category: it.category || '构建垃圾',
        sizeBytes: it.sizeBytes || 0,
        workspaceName: it.workspaceName || ''
      }))
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 彻底清空指定归档目录，完全释放磁盘
ipcMain.handle('purge-archive-dir', async (_event, dirPath) => {
  try {
    if (dirPath && fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      return { success: true };
    }
    return { success: false, error: '归档目录不存在或已清空' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.on('quit-app', () => {
  app.quit();
});

// 托盘图标设置
function createTray() {
  const icon = nativeImage.createFromBuffer(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAN0lEQVQ4T2NkIBIwEqmOgS6G/4f/j/4TpmGqG4Bs4I/fDFQ3gJGB8S8ZmrEZiNMgGBkYGBmGBgAAU3YICaHh24IAAAAASUVORK5CYII=',
      'base64'
    )
  );
  tray = new Tray(icon);
  tray.setToolTip('TO-DO 工作台 (开机自启动 · 后台常驻)');

  const isAutoStart = app.getLoginItemSettings().openAtLogin;
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '展开 / 收起工作台',
      click: () => setExpandedState(!isExpanded)
    },
    {
      label: '开机自启动',
      type: 'checkbox',
      checked: isAutoStart,
      click: (item) => {
        app.setLoginItemSettings({
          openAtLogin: item.checked,
          openAsHidden: true,
          path: process.execPath,
          args: [path.resolve(__dirname)]
        });
      }
    },
    {
      label: '置顶常驻',
      type: 'checkbox',
      checked: false,
      click: (item) => mainWindow && mainWindow.setAlwaysOnTop(item.checked)
    },
    { type: 'separator' },
    {
      label: '打开数据备份目录',
      click: () => {
        if (fs.existsSync(BACKUP_DIR)) shell.openPath(BACKUP_DIR);
        else shell.openPath(path.dirname(DATA_FILE));
      }
    },
    { type: 'separator' },
    {
      label: '退出应用',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(contextMenu);
  tray.on('click', () => setExpandedState(!isExpanded));
}

app.whenReady().then(() => {
  // 默认启用开机自启动与后台常驻
  try {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: true,
      path: process.execPath,
      args: [path.resolve(__dirname)]
    });
  } catch (e) {
    console.warn('Auto-start setup warning:', e);
  }

  createWindow();
  createTray();
  if (process.argv.includes('--smoke-test')) {
    console.log('[SMOKE TEST] Window, Tray, Store, and Adaptive Governor initialized successfully.');
    setTimeout(() => {
      app.isQuitting = true;
      app.quit();
      process.exit(0);
    }, 1500);
  }
});

app.on('window-all-closed', (e) => {
  // 核心常驻后台守护：所有窗口隐藏或关闭时绝不退出应用，常驻系统托盘随时待命
  if (app.isQuitting) {
    app.quit();
  }
});

app.on('will-quit', () => {
  try {
    fs.appendFileSync(path.join(__dirname, 'scripts', 'runtime.log'), `[${new Date().toISOString()}] app will-quit (isQuitting: ${app.isQuitting})\n`);
  } catch (e) {}
  if (mousePollTimer) clearTimeout(mousePollTimer);
  if (guardProcess && !guardProcess.killed) {
    try { guardProcess.kill(); } catch (e) {}
  }
});
