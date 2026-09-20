const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  toggleExpand: () => ipcRenderer.send('toggle-expand'),
  setExpanded: (expanded) => ipcRenderer.send('set-expanded', expanded),
  setIgnoreMouseEvents: (ignore, options) => ipcRenderer.send('set-ignore-mouse-events', ignore, options),
  onPanelStateChanged: (callback) => {
    ipcRenderer.on('panel-state-changed', (_event, value) => callback(value));
  },
  getStore: () => ipcRenderer.invoke('get-store'),
  saveStore: (data) => ipcRenderer.invoke('save-store', data),
  openWorkspace: (projectPath) => ipcRenderer.invoke('open-workspace', projectPath),
  openInExplorer: (targetPath) => ipcRenderer.invoke('open-in-explorer', targetPath),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  scanObsidianProjects: () => ipcRenderer.invoke('scan-obsidian-projects'),
  openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),
  scanWorkspaceHygiene: (targetPath) => ipcRenderer.invoke('scan-workspace-hygiene', targetPath),
  scanWeeklyWorkspaces: () => ipcRenderer.invoke('scan-weekly-workspaces'),
  executeWorkspaceClean: (payload) => ipcRenderer.invoke('execute-workspace-clean', payload),
  purgeArchiveDir: (dirPath) => ipcRenderer.invoke('purge-archive-dir', dirPath),
  toggleRadarWindow: () => ipcRenderer.send('toggle-radar-window'),
  closeRadarWindow: () => ipcRenderer.send('close-radar-window'),
  addRadarTask: (task) => ipcRenderer.invoke('add-radar-task', task),
  onStoreUpdated: (callback) => {
    ipcRenderer.on('store-updated', (_event, store) => callback(store));
  },
  minimizePanel: () => ipcRenderer.send('minimize-panel'),
  resetPosition: () => ipcRenderer.send('reset-position'),
  setPinned: (pinned) => ipcRenderer.send('set-pinned', pinned),
  scanTaskWorkspaces: (paths) => ipcRenderer.invoke('scan-task-workspaces', paths),
  cleanTaskWorkspaces: (paths, explicitItems) => ipcRenderer.invoke('clean-task-workspaces', paths, explicitItems),
  setModalActive: (active) => ipcRenderer.send('set-modal-active', active),
  setBottomPopoverState: (isOpen) => ipcRenderer.send('set-bottom-popover-state', isOpen),
  getAutoStart: () => ipcRenderer.invoke('get-auto-start'),
  setAutoStart: (enable) => ipcRenderer.invoke('set-auto-start', enable),
  getGitHubRateLimit: (token) => ipcRenderer.invoke('get-github-rate-limit', token),
  fetchGitHubRadar: (options) => ipcRenderer.invoke('fetch-github-radar', options),
  quitApp: () => ipcRenderer.send('quit-app')
});
