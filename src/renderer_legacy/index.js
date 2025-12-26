/* ============================================
   OllamaEditor - Main Renderer Script
   ============================================ */

// Global state
const state = {
    currentFolder: null,
    openFiles: new Map(), // path -> { content, model, viewState, dirty }
    activeFile: null,
    editor: null,
    terminal: null,
    sidebarVisible: true,
    panelVisible: true,
    theme: 'vs-dark'
};

// File extension to language mapping
const languageMap = {
    'js': 'javascript',
    'mjs': 'javascript',
    'cjs': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'json': 'json',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'scss',
    'less': 'less',
    'md': 'markdown',
    'markdown': 'markdown',
    'py': 'python',
    'rb': 'ruby',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'php': 'php',
    'sql': 'sql',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'sh': 'shell',
    'bash': 'shell',
    'ps1': 'powershell',
    'bat': 'bat',
    'cmd': 'bat',
    'vue': 'html',
    'svelte': 'html',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'r': 'r',
    'lua': 'lua',
    'perl': 'perl',
    'dockerfile': 'dockerfile',
    'makefile': 'makefile',
    'graphql': 'graphql',
    'env': 'plaintext',
    'gitignore': 'plaintext',
    'txt': 'plaintext'
};

// Commands for command palette
const commands = [
    { id: 'file.newFile', label: 'New File', shortcut: 'Ctrl+N', action: createNewFileAtRoot },
    { id: 'file.newFolder', label: 'New Folder', action: createNewFolderAtRoot },
    { id: 'file.openFolder', label: 'Open Folder', shortcut: 'Ctrl+K Ctrl+O', action: openFolder },
    { id: 'file.save', label: 'Save', shortcut: 'Ctrl+S', action: saveCurrentFile },
    { id: 'file.saveAll', label: 'Save All', shortcut: 'Ctrl+K S', action: saveAllFiles },
    { id: 'view.commandPalette', label: 'Command Palette', shortcut: 'Ctrl+Shift+P', action: showCommandPalette },
    { id: 'view.quickOpen', label: 'Quick Open', shortcut: 'Ctrl+P', action: showQuickOpen },
    { id: 'view.toggleSidebar', label: 'Toggle Sidebar', shortcut: 'Ctrl+B', action: toggleSidebar },
    { id: 'view.toggleTerminal', label: 'Toggle Terminal', shortcut: 'Ctrl+`', action: togglePanel },
    { id: 'edit.find', label: 'Find', shortcut: 'Ctrl+F', action: () => state.editor?.trigger('', 'actions.find') },
    { id: 'edit.replace', label: 'Replace', shortcut: 'Ctrl+H', action: () => state.editor?.trigger('', 'editor.action.startFindReplaceAction') },
    { id: 'edit.goToLine', label: 'Go to Line', shortcut: 'Ctrl+G', action: () => state.editor?.trigger('', 'editor.action.gotoLine') },
    { id: 'editor.formatDocument', label: 'Format Document', shortcut: 'Shift+Alt+F', action: () => state.editor?.trigger('', 'editor.action.formatDocument') },
    { id: 'editor.toggleWordWrap', label: 'Toggle Word Wrap', shortcut: 'Alt+Z', action: toggleWordWrap },
    { id: 'view.refresh', label: 'Refresh Explorer', action: refreshFileTree },
    { id: 'theme.toggleDark', label: 'Theme: Dark', action: () => setTheme('vs-dark') },
    { id: 'theme.toggleLight', label: 'Theme: Light', action: () => setTheme('vs') },
    { id: 'theme.toggleHighContrast', label: 'Theme: High Contrast', action: () => setTheme('hc-black') }
];

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);

async function init() {
    initWindowControls();
    initActivityBar();
    initSidebar();
    initTabs();
    initPanel();
    initResizeHandles();
    initCommandPalette();
    initContextMenu();
    initKeyboardShortcuts();
    initMenuListeners();
    await initMonaco();
    initTerminal();

    // Check if maximized
    const isMax = await window.electronAPI.isMaximized();
    updateMaximizeButton(isMax);
}

// ============================================
// Window Controls
// ============================================
function initWindowControls() {
    document.getElementById('btn-minimize').addEventListener('click', () => {
        window.electronAPI.minimize();
    });

    document.getElementById('btn-maximize').addEventListener('click', () => {
        window.electronAPI.maximize();
    });

    document.getElementById('btn-close').addEventListener('click', () => {
        window.electronAPI.close();
    });

    window.electronAPI.onWindowMaximized((isMaximized) => {
        updateMaximizeButton(isMaximized);
    });
}

function updateMaximizeButton(isMaximized) {
    const btn = document.getElementById('btn-maximize');
    if (isMaximized) {
        btn.innerHTML = `
            <svg width="10" height="10" viewBox="0 0 10 10">
                <rect x="2" y="0" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1"/>
                <rect x="0" y="2" width="8" height="8" fill="var(--bg-tertiary)" stroke="currentColor" stroke-width="1"/>
            </svg>
        `;
        btn.title = 'Restore';
    } else {
        btn.innerHTML = `
            <svg width="10" height="10" viewBox="0 0 10 10">
                <rect width="10" height="10" fill="none" stroke="currentColor" stroke-width="1"/>
            </svg>
        `;
        btn.title = 'Maximize';
    }
}

// ============================================
// Activity Bar
// ============================================
function initActivityBar() {
    const buttons = document.querySelectorAll('.activity-btn[data-panel]');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const panelId = btn.dataset.panel;
            switchSidebarPanel(panelId);

            // Update active state
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update sidebar title
            const titles = {
                'explorer': 'EXPLORER',
                'search': 'SEARCH',
                'source-control': 'SOURCE CONTROL'
            };
            document.querySelector('.sidebar-title').textContent = titles[panelId] || panelId.toUpperCase();
        });
    });

    document.getElementById('btn-settings').addEventListener('click', () => {
        showCommandPalette();
    });
}

function switchSidebarPanel(panelId) {
    document.querySelectorAll('.sidebar-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    const panel = document.getElementById(`panel-${panelId}`);
    if (panel) {
        panel.classList.add('active');
    }
}

// ============================================
// Sidebar & File Explorer
// ============================================
function initSidebar() {
    document.getElementById('btn-open-folder').addEventListener('click', openFolder);
    document.getElementById('welcome-open-folder').addEventListener('click', openFolder);

    // Explorer action buttons
    document.getElementById('btn-new-file-explorer')?.addEventListener('click', (e) => {
        e.stopPropagation();
        createNewFileAtRoot();
    });

    document.getElementById('btn-new-folder-explorer')?.addEventListener('click', (e) => {
        e.stopPropagation();
        createNewFolderAtRoot();
    });

    document.getElementById('btn-refresh-explorer')?.addEventListener('click', (e) => {
        e.stopPropagation();
        refreshFileTree();
    });

    // Search functionality
    const searchInput = document.getElementById('search-input');
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performSearch(searchInput.value);
        }, 300);
    });

    // Folder header toggle
    document.getElementById('folder-header').addEventListener('click', (e) => {
        // Don't toggle if clicking on action buttons
        if (e.target.closest('.explorer-actions')) return;
        e.currentTarget.classList.toggle('expanded');
    });
}

async function createNewFileAtRoot() {
    if (!state.currentFolder) {
        alert('Please open a folder first');
        return;
    }
    showInlineInput(state.currentFolder, 'file');
}

async function createNewFolderAtRoot() {
    if (!state.currentFolder) {
        alert('Please open a folder first');
        return;
    }
    showInlineInput(state.currentFolder, 'folder');
}

function showInlineInput(parentPath, type) {
    const container = document.getElementById('file-tree');

    // Remove any existing inline input
    const existingInput = container.querySelector('.inline-input-container');
    if (existingInput) existingInput.remove();

    // Create inline input
    const inputContainer = document.createElement('div');
    inputContainer.className = 'inline-input-container';
    inputContainer.innerHTML = `
        <span class="icon ${type === 'folder' ? 'folder' : 'file'}">${type === 'folder' ? '📁' : '📄'}</span>
        <input type="text" class="inline-input" placeholder="${type === 'folder' ? 'Folder name' : 'File name'}">
    `;

    // Insert at the beginning of the file tree
    container.insertBefore(inputContainer, container.firstChild);

    const input = inputContainer.querySelector('.inline-input');
    input.focus();

    let committed = false;

    const handleCreate = async () => {
        if (committed) return;
        committed = true;

        const name = input.value.trim();
        if (name) {
            const separator = parentPath.includes('/') ? '/' : '\\';
            const newPath = parentPath + separator + name;

            if (type === 'folder') {
                await window.electronAPI.createFolder(newPath);
            } else {
                await window.electronAPI.createFile(newPath);
                // Open the newly created file
                await openFile(newPath);
            }
            await refreshFileTree();
        }
        inputContainer.remove();
    };

    input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            await handleCreate();
        } else if (e.key === 'Escape') {
            inputContainer.remove();
        }
    });

    input.addEventListener('blur', () => {
        // Commit change on blur if not empty
        setTimeout(handleCreate, 200);
    });
}

async function refreshFileTree() {
    if (state.currentFolder) {
        const tree = await window.electronAPI.getDirectoryTree(state.currentFolder);
        renderFileTree(tree);
    }
}

async function openFolder() {
    const result = await window.electronAPI.openFolder();
    if (result) {
        state.currentFolder = result.path;
        const folderName = result.path.split(/[\\/]/).pop();
        document.getElementById('folder-name').textContent = folderName;
        document.getElementById('folder-header').classList.add('expanded');
        document.getElementById('window-title').textContent = folderName;
        renderFileTree(result.tree);
    }
}

function renderFileTree(tree, container = null, depth = 0) {
    if (!container) {
        container = document.getElementById('file-tree');
        container.innerHTML = '';
    }

    tree.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'file-tree-item';
        itemEl.style.paddingLeft = `${10 + depth * 16}px`;
        itemEl.dataset.path = item.path;
        itemEl.dataset.isDirectory = item.isDirectory;

        const ext = item.name.split('.').pop().toLowerCase();
        const iconClass = getFileIconClass(item.name, item.isDirectory);

        if (item.isDirectory) {
            itemEl.innerHTML = `
                <span class="chevron">▶</span>
                <span class="icon folder">${getFolderIcon()}</span>
                <span class="name">${item.name}</span>
            `;

            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'file-tree-children';

            itemEl.addEventListener('click', (e) => {
                e.stopPropagation();
                itemEl.classList.toggle('expanded');
                childrenContainer.classList.toggle('expanded');
            });

            // Add context menu to folders too
            itemEl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showContextMenu(e, item);
            });

            container.appendChild(itemEl);

            if (item.children && item.children.length > 0) {
                renderFileTree(item.children, childrenContainer, depth + 1);
            }
            container.appendChild(childrenContainer);
        } else {
            itemEl.innerHTML = `
                <span class="icon file ${iconClass}">${getFileIcon(ext)}</span>
                <span class="name">${item.name}</span>
            `;

            itemEl.addEventListener('click', (e) => {
                e.stopPropagation();
                openFile(item.path);
            });

            itemEl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showContextMenu(e, item);
            });

            container.appendChild(itemEl);
        }
    });
}

function getFileIconClass(name, isDirectory) {
    if (isDirectory) return 'folder';
    const ext = name.split('.').pop().toLowerCase();
    return `file-icon-${ext}`;
}

function getFolderIcon() {
    return '📁';
}

function getFileIcon(ext) {
    const icons = {
        'js': '📄',
        'ts': '📄',
        'jsx': '⚛️',
        'tsx': '⚛️',
        'json': '{ }',
        'html': '🌐',
        'css': '🎨',
        'scss': '🎨',
        'md': '📝',
        'py': '🐍',
        'java': '☕',
        'go': '🔵',
        'rs': '🦀',
        'vue': '💚',
        'svelte': '🧡'
    };
    return icons[ext] || '📄';
}

// ============================================
// File Operations
// ============================================
async function openFile(filePath) {
    // Check if editor loaded
    if (typeof monaco === 'undefined' || !state.editor) {
        alert('Editor component not loaded yet. If you are offline, this may fail as standard Monaco CDN is used. Please check your internet connection.');
        return;
    }

    // Check if file is already open
    if (state.openFiles.has(filePath)) {
        switchToFile(filePath);
        return;
    }

    const result = await window.electronAPI.readFile(filePath);
    if (result.success) {
        const fileName = filePath.split(/[\\/]/).pop();
        const ext = fileName.split('.').pop().toLowerCase();
        const language = languageMap[ext] || 'plaintext';

        // Create Monaco model
        const model = monaco.editor.createModel(result.content, language, monaco.Uri.file(filePath));

        state.openFiles.set(filePath, {
            content: result.content,
            model: model,
            viewState: null,
            dirty: false
        });

        // Track changes
        model.onDidChangeContent(() => {
            const fileData = state.openFiles.get(filePath);
            if (fileData) {
                fileData.dirty = model.getValue() !== fileData.content;
                updateTabDirtyState(filePath, fileData.dirty);
            }
        });

        createTab(filePath, fileName);
        switchToFile(filePath);

        // Update status bar
        updateStatusBar(filePath, language);
    }
}

function switchToFile(filePath) {
    if (state.activeFile) {
        // Save view state of current file
        const currentFileData = state.openFiles.get(state.activeFile);
        if (currentFileData && state.editor) {
            currentFileData.viewState = state.editor.saveViewState();
        }
    }

    state.activeFile = filePath;
    const fileData = state.openFiles.get(filePath);

    if (fileData && state.editor) {
        state.editor.setModel(fileData.model);
        if (fileData.viewState) {
            state.editor.restoreViewState(fileData.viewState);
        }
        state.editor.focus();

        // Hide welcome screen
        document.getElementById('welcome-screen').classList.add('hidden');

        // Update active tab
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.path === filePath);
        });

        // Update window title
        const fileName = filePath.split(/[\\/]/).pop();
        document.getElementById('window-title').textContent = fileName;

        // Update status bar
        const ext = fileName.split('.').pop().toLowerCase();
        updateStatusBar(filePath, languageMap[ext] || 'plaintext');
    }
}

async function saveCurrentFile() {
    if (!state.activeFile) return;
    await saveFile(state.activeFile);
}

async function saveFile(filePath) {
    const fileData = state.openFiles.get(filePath);
    if (!fileData) return;

    const content = fileData.model.getValue();
    const result = await window.electronAPI.writeFile(filePath, content);

    if (result.success) {
        fileData.content = content;
        fileData.dirty = false;
        updateTabDirtyState(filePath, false);
    }
}

async function saveAllFiles() {
    for (const [filePath, fileData] of state.openFiles) {
        if (fileData.dirty) {
            await saveFile(filePath);
        }
    }
}

function closeFile(filePath) {
    const fileData = state.openFiles.get(filePath);
    if (fileData) {
        fileData.model.dispose();
        state.openFiles.delete(filePath);
    }

    // Remove tab
    const tab = document.querySelector(`.tab[data-path="${CSS.escape(filePath)}"]`);
    if (tab) tab.remove();

    // Switch to another file or show welcome
    if (state.activeFile === filePath) {
        const remainingFiles = Array.from(state.openFiles.keys());
        if (remainingFiles.length > 0) {
            switchToFile(remainingFiles[remainingFiles.length - 1]);
        } else {
            state.activeFile = null;
            state.editor.setModel(null);
            document.getElementById('welcome-screen').classList.remove('hidden');
            document.getElementById('window-title').textContent = 'Welcome';
        }
    }
}

// ============================================
// Search
// ============================================
async function performSearch(query) {
    const resultsContainer = document.getElementById('search-results');

    if (!query || !state.currentFolder) {
        resultsContainer.innerHTML = '<div class="empty-message">Type to search</div>';
        return;
    }

    resultsContainer.innerHTML = '<div class="empty-message">Searching...</div>';

    const results = await window.electronAPI.searchInFiles(state.currentFolder, query);

    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="empty-message">No results found</div>';
        return;
    }

    resultsContainer.innerHTML = '';

    // Group by file
    const grouped = {};
    results.forEach(r => {
        if (!grouped[r.file]) grouped[r.file] = [];
        grouped[r.file].push(r);
    });

    Object.entries(grouped).forEach(([file, matches]) => {
        const fileName = file.split(/[\\/]/).pop();
        const relativePath = file.replace(state.currentFolder, '').replace(/^[\\/]/, '');

        const fileEl = document.createElement('div');
        fileEl.className = 'search-result-item';
        fileEl.innerHTML = `
            <div class="search-result-file">${fileName}</div>
            <div class="text-muted">${relativePath}</div>
        `;

        matches.forEach(match => {
            const matchEl = document.createElement('div');
            matchEl.className = 'search-result-item search-result-line';

            // Highlight the match
            const highlighted = match.content.replace(
                new RegExp(`(${escapeRegex(query)})`, 'gi'),
                '<span class="search-result-match">$1</span>'
            );
            matchEl.innerHTML = `<span class="text-muted">${match.line}:</span> ${highlighted}`;

            matchEl.addEventListener('click', async () => {
                await openFile(file);
                state.editor.setPosition({ lineNumber: match.line, column: match.matchStart + 1 });
                state.editor.revealLineInCenter(match.line);
            });

            resultsContainer.appendChild(matchEl);
        });

        resultsContainer.appendChild(fileEl);
    });
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================
// Tabs
// ============================================
function initTabs() {
    // Tab container is handled dynamically
}

function createTab(filePath, fileName) {
    const tabsContainer = document.getElementById('tabs');

    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset.path = filePath;

    const ext = fileName.split('.').pop().toLowerCase();

    tab.innerHTML = `
        <span class="icon ${getFileIconClass(fileName, false)}">${getFileIcon(ext)}</span>
        <span class="name">${fileName}</span>
        <span class="close-btn" title="Close">×</span>
    `;

    tab.addEventListener('click', (e) => {
        if (!e.target.classList.contains('close-btn')) {
            switchToFile(filePath);
        }
    });

    tab.querySelector('.close-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        closeFile(filePath);
    });

    // Middle-click to close
    tab.addEventListener('auxclick', (e) => {
        if (e.button === 1) {
            closeFile(filePath);
        }
    });

    tabsContainer.appendChild(tab);
}

function updateTabDirtyState(filePath, isDirty) {
    const tab = document.querySelector(`.tab[data-path="${CSS.escape(filePath)}"]`);
    if (tab) {
        tab.classList.toggle('dirty', isDirty);
    }
}

// ============================================
// Monaco Editor
// ============================================
async function initMonaco() {
    return new Promise((resolve) => {
        require.config({
            paths: {
                'vs': 'https://unpkg.com/monaco-editor@0.45.0/min/vs'
            }
        });

        require(['vs/editor/editor.main'], function () {
            // Configure Monaco themes
            monaco.editor.defineTheme('ollama-dark', {
                base: 'vs-dark',
                inherit: true,
                rules: [],
                colors: {
                    'editor.background': '#1e1e1e',
                    'editor.foreground': '#d4d4d4',
                    'editorCursor.foreground': '#aeafad',
                    'editor.lineHighlightBackground': '#2d2d2d',
                    'editorLineNumber.foreground': '#858585',
                    'editor.selectionBackground': '#264f78',
                    'editor.inactiveSelectionBackground': '#3a3d41'
                }
            });

            state.editor = monaco.editor.create(document.getElementById('monaco-container'), {
                theme: 'ollama-dark',
                fontSize: 14,
                fontFamily: "'JetBrains Mono', Consolas, 'Courier New', monospace",
                fontLigatures: true,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                insertSpaces: true,
                wordWrap: 'off',
                lineNumbers: 'on',
                renderWhitespace: 'selection',
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                smoothScrolling: true,
                bracketPairColorization: { enabled: true },
                guides: {
                    bracketPairs: true,
                    indentation: true
                },
                padding: { top: 10 }
            });

            // Update cursor position in status bar
            state.editor.onDidChangeCursorPosition((e) => {
                const pos = e.position;
                document.getElementById('status-cursor').textContent = `Ln ${pos.lineNumber}, Col ${pos.column}`;
            });

            resolve();
        });
    });
}

function updateStatusBar(filePath, language) {
    document.getElementById('status-language').textContent = language.charAt(0).toUpperCase() + language.slice(1);
}

function setTheme(themeName) {
    state.theme = themeName;
    monaco.editor.setTheme(themeName);

    // Update CSS variables for light theme
    if (themeName === 'vs') {
        document.documentElement.style.setProperty('--bg-primary', '#ffffff');
        document.documentElement.style.setProperty('--bg-secondary', '#f3f3f3');
        document.documentElement.style.setProperty('--bg-tertiary', '#e8e8e8');
        document.documentElement.style.setProperty('--text-primary', '#333333');
        document.documentElement.style.setProperty('--text-secondary', '#616161');
        document.documentElement.style.setProperty('--border-primary', '#c8c8c8');
    } else {
        document.documentElement.style.setProperty('--bg-primary', '#1e1e1e');
        document.documentElement.style.setProperty('--bg-secondary', '#252526');
        document.documentElement.style.setProperty('--bg-tertiary', '#2d2d2d');
        document.documentElement.style.setProperty('--text-primary', '#cccccc');
        document.documentElement.style.setProperty('--text-secondary', '#858585');
        document.documentElement.style.setProperty('--border-primary', '#3c3c3c');
    }
}

function toggleWordWrap() {
    const currentWrap = state.editor.getOption(monaco.editor.EditorOption.wordWrap);
    state.editor.updateOptions({ wordWrap: currentWrap === 'on' ? 'off' : 'on' });
}

// ============================================
// Terminal
// ============================================
async function initTerminal() {
    const container = document.getElementById('terminal-container');

    // Create a simple terminal placeholder
    // Full terminal with xterm.js + node-pty requires additional setup
    container.innerHTML = `
        <div style="padding: 10px; font-family: var(--font-mono); font-size: 13px; color: var(--text-primary);">
            <div style="margin-bottom: 10px; color: var(--text-secondary);">
                Terminal integration requires xterm.js and node-pty.<br>
                Run: npm install xterm xterm-addon-fit node-pty
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: #6a9955;">PS</span>
                <span style="color: var(--text-primary);">${await window.electronAPI.getHomeDir()}</span>
                <span style="color: #569cd6;">&gt;</span>
                <input type="text" id="terminal-input" style="
                    flex: 1;
                    background: transparent;
                    border: none;
                    color: var(--text-primary);
                    font-family: inherit;
                    font-size: inherit;
                    outline: none;
                " placeholder="Type commands here...">
            </div>
            <div id="terminal-output" style="margin-top: 10px; white-space: pre-wrap;"></div>
        </div>
    `;

    // Simple command execution placeholder
    const input = document.getElementById('terminal-input');
    const output = document.getElementById('terminal-output');

    input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const cmd = input.value;
            if (cmd.trim()) {
                output.textContent += `> ${cmd}\n`;
                output.textContent += `Command execution requires node-pty integration.\n\n`;
                input.value = '';
            }
        }
    });
}

// ============================================
// Panel (Terminal, Problems, Output)
// ============================================
function initPanel() {
    // Panel tabs
    document.querySelectorAll('.panel-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const panelId = tab.dataset.panel;

            document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            document.querySelectorAll('.panel-view').forEach(v => v.classList.remove('active'));
            document.getElementById(`panel-${panelId}`)?.classList.add('active');
        });
    });

    // Close panel button
    document.getElementById('btn-close-panel').addEventListener('click', () => {
        togglePanel();
    });

    // New terminal button
    document.getElementById('btn-new-terminal').addEventListener('click', () => {
        // Would create a new terminal instance
    });
}

function togglePanel() {
    const panel = document.getElementById('panel');
    const handle = document.getElementById('panel-resize-handle');
    state.panelVisible = !state.panelVisible;

    if (state.panelVisible) {
        panel.classList.remove('hidden');
        handle.style.display = 'block';
    } else {
        panel.classList.add('hidden');
        handle.style.display = 'none';
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const handle = document.getElementById('sidebar-resize-handle');
    state.sidebarVisible = !state.sidebarVisible;

    if (state.sidebarVisible) {
        sidebar.classList.remove('hidden');
        handle.style.display = 'block';
    } else {
        sidebar.classList.add('hidden');
        handle.style.display = 'none';
    }
}

// ============================================
// Resize Handles
// ============================================
function initResizeHandles() {
    // Sidebar resize
    const sidebarHandle = document.getElementById('sidebar-resize-handle');
    const sidebar = document.getElementById('sidebar');

    let isResizing = false;

    sidebarHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        sidebarHandle.classList.add('active');
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const activityBarWidth = 48;
        const newWidth = e.clientX - activityBarWidth;

        if (newWidth >= 150 && newWidth <= 500) {
            sidebar.style.width = newWidth + 'px';
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            sidebarHandle.classList.remove('active');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });

    // Panel resize
    const panelHandle = document.getElementById('panel-resize-handle');
    const panel = document.getElementById('panel');

    let isPanelResizing = false;

    panelHandle.addEventListener('mousedown', (e) => {
        isPanelResizing = true;
        panelHandle.classList.add('active');
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isPanelResizing) return;

        const editorContainer = document.getElementById('editor-container');
        const containerRect = editorContainer.getBoundingClientRect();
        const newHeight = containerRect.bottom - e.clientY;

        if (newHeight >= 100 && newHeight <= 500) {
            panel.style.height = newHeight + 'px';
        }
    });

    document.addEventListener('mouseup', () => {
        if (isPanelResizing) {
            isPanelResizing = false;
            panelHandle.classList.remove('active');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
}

// ============================================
// Command Palette
// ============================================
function initCommandPalette() {
    const palette = document.getElementById('command-palette');
    const input = document.getElementById('command-input');
    const list = document.getElementById('command-list');

    input.addEventListener('input', () => {
        filterCommands(input.value);
    });

    input.addEventListener('keydown', (e) => {
        const selected = list.querySelector('.command-item.selected');
        const items = list.querySelectorAll('.command-item');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!selected && items.length > 0) {
                items[0].classList.add('selected');
            } else if (selected && selected.nextElementSibling) {
                selected.classList.remove('selected');
                selected.nextElementSibling.classList.add('selected');
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (selected && selected.previousElementSibling) {
                selected.classList.remove('selected');
                selected.previousElementSibling.classList.add('selected');
            }
        } else if (e.key === 'Enter') {
            if (selected) {
                selected.click();
            }
        } else if (e.key === 'Escape') {
            hideCommandPalette();
        }
    });

    palette.addEventListener('click', (e) => {
        if (e.target === palette) {
            hideCommandPalette();
        }
    });
}

function showCommandPalette() {
    const palette = document.getElementById('command-palette');
    const input = document.getElementById('command-input');

    palette.classList.remove('hidden');
    input.value = '';
    input.placeholder = 'Type a command or search...';
    input.focus();
    filterCommands('');
}

function showQuickOpen() {
    const palette = document.getElementById('command-palette');
    const input = document.getElementById('command-input');

    palette.classList.remove('hidden');
    input.value = '';
    input.placeholder = 'Search files by name...';
    input.focus();

    // Show file list
    showFileList('');

    // Change input listener for file search
    input.oninput = () => showFileList(input.value);
}

function showFileList(query) {
    const list = document.getElementById('command-list');
    list.innerHTML = '';

    if (!state.currentFolder) {
        list.innerHTML = '<div class="empty-message">No folder opened</div>';
        return;
    }

    // Get all open files and folder files
    const allFiles = [];

    function collectFiles(tree) {
        tree.forEach(item => {
            if (!item.isDirectory) {
                allFiles.push(item);
            } else if (item.children) {
                collectFiles(item.children);
            }
        });
    }

    // We need to re-fetch directory tree for quick open
    // For now, show open files
    state.openFiles.forEach((data, path) => {
        const fileName = path.split(/[\\/]/).pop();
        if (!query || fileName.toLowerCase().includes(query.toLowerCase())) {
            const item = document.createElement('div');
            item.className = 'command-item';
            item.innerHTML = `
                <div class="command-item-label">
                    <span class="command-item-text">${fileName}</span>
                    <span class="command-item-type">${path.replace(state.currentFolder || '', '')}</span>
                </div>
            `;
            item.addEventListener('click', () => {
                switchToFile(path);
                hideCommandPalette();
            });
            list.appendChild(item);
        }
    });

    if (list.children.length === 0) {
        list.innerHTML = '<div class="empty-message">No matching files</div>';
    }
}

function hideCommandPalette() {
    document.getElementById('command-palette').classList.add('hidden');
    document.getElementById('command-input').oninput = null;
    state.editor?.focus();
}

function filterCommands(query) {
    const list = document.getElementById('command-list');
    list.innerHTML = '';

    const filtered = commands.filter(cmd =>
        cmd.label.toLowerCase().includes(query.toLowerCase())
    );

    filtered.forEach((cmd, index) => {
        const item = document.createElement('div');
        item.className = 'command-item' + (index === 0 ? ' selected' : '');
        item.innerHTML = `
            <div class="command-item-label">
                <span class="command-item-text">${cmd.label}</span>
            </div>
            ${cmd.shortcut ? `<span class="command-item-shortcut">${cmd.shortcut}</span>` : ''}
        `;
        item.addEventListener('click', () => {
            hideCommandPalette();
            cmd.action();
        });
        list.appendChild(item);
    });
}

// ============================================
// Context Menu
// ============================================
let contextMenuTarget = null;

function initContextMenu() {
    const menu = document.getElementById('context-menu');

    document.addEventListener('click', () => {
        menu.classList.add('hidden');
    });

    document.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', () => {
            handleContextMenuAction(item.dataset.action);
            menu.classList.add('hidden');
        });
    });
}

function showContextMenu(e, item) {
    const menu = document.getElementById('context-menu');
    contextMenuTarget = item;

    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    menu.classList.remove('hidden');
}

async function handleContextMenuAction(action) {
    if (!contextMenuTarget) return;

    const targetPath = contextMenuTarget.path;
    const isDirectory = contextMenuTarget.isDirectory;
    const separator = targetPath.includes('/') ? '/' : '\\';

    // Get parent directory path
    const getParentDir = (p) => {
        const lastSep = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
        return p.substring(0, lastSep);
    };

    // For directories, create inside; for files, create in same directory
    const targetDir = isDirectory ? targetPath : getParentDir(targetPath);

    switch (action) {
        case 'new-file':
            const fileName = prompt('Enter file name:');
            if (fileName) {
                const newPath = targetDir + separator + fileName;
                const result = await window.electronAPI.createFile(newPath);
                if (result.success) {
                    await refreshFileTree();
                    await openFile(newPath);
                } else {
                    alert('Failed to create file: ' + result.error);
                }
            }
            break;
        case 'new-folder':
            const folderName = prompt('Enter folder name:');
            if (folderName) {
                const newPath = targetDir + separator + folderName;
                const result = await window.electronAPI.createFolder(newPath);
                if (result.success) {
                    await refreshFileTree();
                } else {
                    alert('Failed to create folder: ' + result.error);
                }
            }
            break;
        case 'rename':
            const newName = prompt('Enter new name:', contextMenuTarget.name);
            if (newName && newName !== contextMenuTarget.name) {
                const parentDir = getParentDir(targetPath);
                const newPath = parentDir + separator + newName;
                const result = await window.electronAPI.renameItem(targetPath, newPath);
                if (result.success) {
                    // If file was open, update its reference
                    if (state.openFiles.has(targetPath)) {
                        const fileData = state.openFiles.get(targetPath);
                        state.openFiles.delete(targetPath);
                        state.openFiles.set(newPath, fileData);
                        if (state.activeFile === targetPath) {
                            state.activeFile = newPath;
                        }
                        // Update tab
                        const tab = document.querySelector(`.tab[data-path="${CSS.escape(targetPath)}"]`);
                        if (tab) {
                            tab.dataset.path = newPath;
                            tab.querySelector('.name').textContent = newName;
                        }
                    }
                    await refreshFileTree();
                } else {
                    alert('Failed to rename: ' + result.error);
                }
            }
            break;
        case 'delete':
            if (confirm(`Delete "${contextMenuTarget.name}"?`)) {
                const result = await window.electronAPI.deleteItem(targetPath);
                if (result.success) {
                    closeFile(targetPath);
                    await refreshFileTree();
                } else {
                    alert('Failed to delete: ' + result.error);
                }
            }
            break;
    }
}

// ============================================
// Keyboard Shortcuts
// ============================================
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+Shift+P - Command Palette
        if (e.ctrlKey && e.shiftKey && e.key === 'P') {
            e.preventDefault();
            showCommandPalette();
        }
        // Ctrl+P - Quick Open
        else if (e.ctrlKey && !e.shiftKey && e.key === 'p') {
            e.preventDefault();
            showQuickOpen();
        }
        // Ctrl+S - Save
        else if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveCurrentFile();
        }
        // Ctrl+N - New File
        else if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            createNewFileAtRoot();
        }
        // Ctrl+B - Toggle Sidebar
        else if (e.ctrlKey && e.key === 'b') {
            e.preventDefault();
            toggleSidebar();
        }
        // Ctrl+` - Toggle Terminal
        else if (e.ctrlKey && e.key === '`') {
            e.preventDefault();
            togglePanel();
        }
        // Ctrl+W - Close Tab
        else if (e.ctrlKey && e.key === 'w') {
            e.preventDefault();
            if (state.activeFile) {
                closeFile(state.activeFile);
            }
        }
        // Escape - Close palette
        else if (e.key === 'Escape') {
            hideCommandPalette();
        }
    });
}

// ============================================
// Menu Listeners (from main process)
// ============================================
function initMenuListeners() {
    window.electronAPI.onMenuOpenFolder(openFolder);
    window.electronAPI.onMenuSave(saveCurrentFile);
    window.electronAPI.onMenuFind(() => state.editor?.trigger('', 'actions.find'));
    window.electronAPI.onMenuReplace(() => state.editor?.trigger('', 'editor.action.startFindReplaceAction'));
    window.electronAPI.onMenuCommandPalette(showCommandPalette);
    window.electronAPI.onMenuQuickOpen(showQuickOpen);
    window.electronAPI.onMenuToggleTerminal(togglePanel);
    window.electronAPI.onMenuToggleSidebar(toggleSidebar);
}
