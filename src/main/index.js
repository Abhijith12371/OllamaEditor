const electron = require('electron');
const { app, BrowserWindow, ipcMain, dialog, Menu } = electron;
const path = require('path');
const fs = require('fs');
const os = require('os');

// Try to load node-pty for real terminal support
let pty;
try {
    pty = require('node-pty');
    console.log('node-pty loaded successfully');
} catch (e) {
    console.warn('node-pty not available, terminal will be limited:', e.message);
}

let mainWindow;
let currentFolder = null;
const terminals = new Map(); // Store active terminal processes
let terminalIdCounter = 0;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        frame: false,
        backgroundColor: '#1e1e1e',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../preload/index.js')
        },
        icon: path.join(__dirname, '../../assets/icon.png')
    });

    // Dev mode (Vite) vs Production (File)
    if (process.argv.includes('--dev')) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
    }

    mainWindow.on('maximize', () => {
        mainWindow.webContents.send('window-maximized', true);
    });

    mainWindow.on('unmaximize', () => {
        mainWindow.webContents.send('window-maximized', false);
    });

    // Clean up terminals on window close
    mainWindow.on('closed', () => {
        terminals.forEach((term) => {
            try { term.kill(); } catch (e) { }
        });
        terminals.clear();
    });
}

// Window control handlers
ipcMain.handle('window-minimize', () => {
    mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow.maximize();
    }
});

ipcMain.handle('window-close', () => {
    mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
    return mainWindow.isMaximized();
});

// ============= TERMINAL HANDLERS =============

// Create a new terminal process
ipcMain.handle('terminal-create', async (event, cwd) => {
    if (!pty) {
        return { success: false, error: 'node-pty not available' };
    }

    const id = ++terminalIdCounter;
    const shell = process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/bash';
    const workingDir = cwd || currentFolder || os.homedir();

    try {
        const term = pty.spawn(shell, [], {
            name: 'xterm-256color',
            cols: 120,
            rows: 30,
            cwd: workingDir,
            env: process.env,
            useConpty: false // Disable ConPTY to avoid AttachConsole error
        });

        terminals.set(id, term);

        // Forward terminal output to renderer
        term.onData((data) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('terminal-data', { id, data });
            }
        });

        term.onExit(({ exitCode }) => {
            terminals.delete(id);
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('terminal-exit', { id, exitCode });
            }
        });

        return { success: true, id, cwd: workingDir };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Write data to terminal
ipcMain.handle('terminal-write', async (event, id, data) => {
    const term = terminals.get(id);
    if (term) {
        term.write(data);
        return { success: true };
    }
    return { success: false, error: 'Terminal not found' };
});

// Resize terminal
ipcMain.handle('terminal-resize', async (event, id, cols, rows) => {
    const term = terminals.get(id);
    if (term) {
        term.resize(cols, rows);
        return { success: true };
    }
    return { success: false, error: 'Terminal not found' };
});

// Kill terminal
ipcMain.handle('terminal-kill', async (event, id) => {
    const term = terminals.get(id);
    if (term) {
        term.kill();
        terminals.delete(id);
        return { success: true };
    }
    return { success: false, error: 'Terminal not found' };
});

// Check if real terminal is available
ipcMain.handle('terminal-available', async () => {
    return { available: !!pty };
});

// ============= FILE SYSTEM HANDLERS =============

ipcMain.handle('open-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
        currentFolder = result.filePaths[0];
        return {
            path: currentFolder,
            tree: await getDirectoryTree(currentFolder)
        };
    }
    return null;
});

ipcMain.handle('get-directory-tree', async (event, folderPath) => {
    return await getDirectoryTree(folderPath);
});

ipcMain.handle('read-file', async (event, filePath) => {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return { success: true, content };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, content, 'utf-8');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('create-file', async (event, filePath) => {
    try {
        // Create parent directories if they don't exist
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        // Only create if doesn't exist
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, '', 'utf-8');
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('create-folder', async (event, folderPath) => {
    try {
        fs.mkdirSync(folderPath, { recursive: true });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('delete-item', async (event, itemPath) => {
    try {
        const stat = fs.statSync(itemPath);
        if (stat.isDirectory()) {
            fs.rmSync(itemPath, { recursive: true });
        } else {
            fs.unlinkSync(itemPath);
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('rename-item', async (event, oldPath, newPath) => {
    try {
        fs.renameSync(oldPath, newPath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('search-in-files', async (event, folderPath, searchText) => {
    const results = [];
    await searchInDirectory(folderPath, searchText, results);
    return results;
});

ipcMain.handle('get-shell', () => {
    if (process.platform === 'win32') {
        return 'powershell.exe';
    }
    return process.env.SHELL || '/bin/bash';
});

ipcMain.handle('get-home-dir', () => {
    return os.homedir();
});

async function getDirectoryTree(dirPath, depth = 0, maxDepth = 10) {
    if (depth > maxDepth) return [];

    const items = [];
    try {
        if (!fs.existsSync(dirPath)) {
            console.warn(`Directory does not exist: ${dirPath}`);
            return [];
        }
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        // Sort: folders first, then files, both alphabetically
        entries.sort((a, b) => {
            if (a.isDirectory() && !b.isDirectory()) return -1;
            if (!a.isDirectory() && b.isDirectory()) return 1;
            return a.name.localeCompare(b.name);
        });

        for (const entry of entries) {
            // Skip hidden files and node_modules
            if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

            const fullPath = path.join(dirPath, entry.name);
            const item = {
                name: entry.name,
                path: fullPath,
                isDirectory: entry.isDirectory()
            };

            if (entry.isDirectory()) {
                item.children = await getDirectoryTree(fullPath, depth + 1, maxDepth);
            }

            items.push(item);
        }
    } catch (error) {
        console.error('Error reading directory:', error);
    }

    return items;
}

async function searchInDirectory(dirPath, searchText, results, maxResults = 100) {
    if (results.length >= maxResults) return;

    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            if (results.length >= maxResults) break;
            if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
                await searchInDirectory(fullPath, searchText, results, maxResults);
            } else {
                try {
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    const lines = content.split('\n');

                    lines.forEach((line, index) => {
                        if (line.toLowerCase().includes(searchText.toLowerCase())) {
                            results.push({
                                file: fullPath,
                                line: index + 1,
                                content: line.trim(),
                                matchStart: line.toLowerCase().indexOf(searchText.toLowerCase())
                            });
                        }
                    });
                } catch (e) {
                    // Skip binary files or files that can't be read
                }
            }
        }
    } catch (error) {
        console.error('Error searching directory:', error);
    }
}

// Create menu
function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Open Folder',
                    accelerator: 'CmdOrCtrl+K CmdOrCtrl+O',
                    click: async () => {
                        mainWindow.webContents.send('menu-open-folder');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Save',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => {
                        mainWindow.webContents.send('menu-save');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    accelerator: 'Alt+F4',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { type: 'separator' },
                {
                    label: 'Find',
                    accelerator: 'CmdOrCtrl+F',
                    click: () => {
                        mainWindow.webContents.send('menu-find');
                    }
                },
                {
                    label: 'Replace',
                    accelerator: 'CmdOrCtrl+H',
                    click: () => {
                        mainWindow.webContents.send('menu-replace');
                    }
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Command Palette',
                    accelerator: 'CmdOrCtrl+Shift+P',
                    click: () => {
                        mainWindow.webContents.send('menu-command-palette');
                    }
                },
                {
                    label: 'Quick Open',
                    accelerator: 'CmdOrCtrl+P',
                    click: () => {
                        mainWindow.webContents.send('menu-quick-open');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Toggle Terminal',
                    accelerator: 'CmdOrCtrl+`',
                    click: () => {
                        mainWindow.webContents.send('menu-toggle-terminal');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Toggle Sidebar',
                    accelerator: 'CmdOrCtrl+B',
                    click: () => {
                        mainWindow.webContents.send('menu-toggle-sidebar');
                    }
                },
                { type: 'separator' },
                { role: 'toggleDevTools' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About OllamaEditor',
                            message: 'OllamaEditor v1.0.0',
                            detail: 'A VS Code-like code editor built with Electron and Ollama AI'
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
    createWindow();
    createMenu();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    // Clean up all terminals
    terminals.forEach((term) => {
        try { term.kill(); } catch (e) { }
    });
    terminals.clear();

    if (process.platform !== 'darwin') {
        app.quit();
    }
});
