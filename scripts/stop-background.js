const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const appDir = path.resolve(__dirname, '..');
const electronExe = path.join(appDir, 'node_modules', 'electron', 'dist', 'electron.exe');

if (process.platform !== 'win32') {
  console.error('[FAIL] Background stop is supported only on Windows.');
  process.exitCode = 1;
} else if (!fs.existsSync(electronExe)) {
  console.error('[FAIL] Electron is missing. Run npm install first.');
  process.exitCode = 1;
} else {
  const result = spawnSync(electronExe, [appDir, '--quit'], {
    cwd: appDir,
    stdio: 'ignore',
    windowsHide: true,
    timeout: 15000
  });

  if (result.error || result.status !== 0) {
    console.error('[FAIL] Could not send the app-specific quit request:', result.error ? result.error.message : result.status);
    process.exitCode = 1;
  } else {
    console.log('[OK] Sent a graceful quit request to this TO-DO Panel instance.');
  }
}
