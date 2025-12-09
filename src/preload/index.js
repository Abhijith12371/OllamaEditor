const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Window controls
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    close: () => ipcRenderer.invoke('window-close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

    // File system
    openFolder: () => ipcRenderer.invoke('open-folder'),
    getDirectoryTree: (folderPath) => ipcRenderer.invoke('get-directory-tree', folderPath),
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
    createFile: (filePath) => ipcRenderer.invoke('create-file', filePath),
    createFolder: (folderPath) => ipcRenderer.invoke('create-folder', folderPath),
    deleteItem: (itemPath) => ipcRenderer.invoke('delete-item', itemPath),
    renameItem: (oldPath, newPath) => ipcRenderer.invoke('rename-item', oldPath, newPath),
    searchInFiles: (folderPath, searchText) => ipcRenderer.invoke('search-in-files', folderPath, searchText),

    // Terminal
    getShell: () => ipcRenderer.invoke('get-shell'),
    getHomeDir: () => ipcRenderer.invoke('get-home-dir'),

    // Event listeners
    onWindowMaximized: (callback) => ipcRenderer.on('window-maximized', (event, isMaximized) => callback(isMaximized)),
    onMenuOpenFolder: (callback) => ipcRenderer.on('menu-open-folder', () => callback()),
    onMenuSave: (callback) => ipcRenderer.on('menu-save', () => callback()),
    onMenuFind: (callback) => ipcRenderer.on('menu-find', () => callback()),
    onMenuReplace: (callback) => ipcRenderer.on('menu-replace', () => callback()),
    onMenuCommandPalette: (callback) => ipcRenderer.on('menu-command-palette', () => callback()),
    onMenuQuickOpen: (callback) => ipcRenderer.on('menu-quick-open', () => callback()),
    onMenuToggleTerminal: (callback) => ipcRenderer.on('menu-toggle-terminal', () => callback()),
    onMenuToggleSidebar: (callback) => ipcRenderer.on('menu-toggle-sidebar', () => callback())
});
