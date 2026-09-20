const cp = require('child_process');
const path = require('path');

const electronExe = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe');
const appDir = path.join(__dirname, '..');

try {
  cp.execSync('powershell -NoProfile -Command "Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine = \'Q:\\Todo\\node_modules\\electron\\dist\\electron.exe Q:\\Todo\'}"', { stdio: 'ignore' });
  console.log('[OK] TO-DO Panel background resident process started via WMI.');
} catch (e) {
  console.error('[FAIL] Failed to launch background process:', e);
}
process.exit(0);
