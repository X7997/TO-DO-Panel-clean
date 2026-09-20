const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const appDir = path.resolve(__dirname, '..');
const electronExe = path.join(appDir, 'node_modules', 'electron', 'dist', 'electron.exe');
const launchScript = path.join(__dirname, 'start-background.ps1');

if (process.platform !== 'win32') {
  console.error('[FAIL] Background launch is supported only on Windows.');
  process.exitCode = 1;
} else if (!fs.existsSync(electronExe)) {
  console.error('[FAIL] Electron is missing. Run npm install first.');
  process.exitCode = 1;
} else if (!fs.existsSync(launchScript)) {
  console.error('[FAIL] WMI launch script is missing:', launchScript);
  process.exitCode = 1;
} else {
  try {
    const output = execFileSync('powershell.exe', [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-File', launchScript
    ], {
      cwd: appDir,
      windowsHide: true,
      encoding: 'utf8',
      timeout: 30000
    });
    process.stdout.write(output);
  } catch (error) {
    const detail = error.stderr ? String(error.stderr).trim() : error.message;
    console.error('[FAIL] WMI could not start TO-DO Panel:', detail);
    process.exitCode = 1;
  }
}
