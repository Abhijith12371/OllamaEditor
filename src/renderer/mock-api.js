/**
 * Mock Electron API for Browser Testing
 * Simulates IPC communication and file system operations in memory.
 */

console.log('Using Mock Electron API');

const mockFileSystem = {
    'C:/Projects/MyProject': {
        type: 'directory',
        children: {
            'src': {
                type: 'directory',
                children: {
                    'index.js': { type: 'file', content: 'console.log("Hello");' },
                    'style.css': { type: 'file', content: 'body { color: red; }' }
                }
            },
            'package.json': { type: 'file', content: '{ "name": "test-project" }' },
            'README.md': { type: 'file', content: '# Test Project' }
        }
    }
};

let currentPath = 'C:/Projects/MyProject';

function getTree(path) {
    // Traverse mockFileSystem to generate tree for 'path'
    // Simplified: return a static tree structure for the mock root
    return [
        {
            name: 'src',
            path: path + '/src',
            isDirectory: true,
            children: [
                { name: 'index.js', path: path + '/src/index.js', isDirectory: false },
                { name: 'style.css', path: path + '/src/style.css', isDirectory: false }
            ]
        },
        { name: 'package.json', path: path + '/package.json', isDirectory: false },
        { name: 'README.md', path: path + '/README.md', isDirectory: false }
    ];
}

window.electronAPI = {
    // Window Controls
    minimize: () => console.log('Window Minimized'),
    maximize: () => console.log('Window Maximized'),
    close: () => console.log('Window Closed'),
    isMaximized: () => Promise.resolve(false),
    onWindowMaximized: (cb) => { window._maximizedCb = cb; },

    // File System
    openFolder: () => {
        console.log('Mock: Open Folder Dialog');
        // Simulate selecting the mock folder
        return Promise.resolve({
            path: currentPath,
            tree: getTree(currentPath)
        });
    },

    getDirectoryTree: (path) => {
        console.log('Mock: Get Directory Tree', path);
        return Promise.resolve(getTree(path));
    },

    readFile: (path) => {
        console.log('Mock: Read File', path);
        return Promise.resolve({
            success: true,
            content: '// Mock file content for ' + path
        });
    },

    createFile: (path) => {
        console.log('Mock: Create File', path);
        return Promise.resolve({ success: true });
    },

    createFolder: (path) => {
        console.log('Mock: Create Folder', path);
        return Promise.resolve({ success: true });
    },

    renameItem: (oldPath, newPath) => {
        console.log('Mock: Rename', oldPath, 'to', newPath);
        return Promise.resolve({ success: true });
    },

    deleteItem: (path) => {
        console.log('Mock: Delete', path);
        return Promise.resolve({ success: true });
    },

    searchInFiles: (folder, query) => {
        console.log('Mock: Search', query);
        return Promise.resolve([]);
    },

    // Menu Listeners Stub
    onMenuOpenFolder: () => { },
    onMenuSave: () => { },
    onMenuFind: () => { },
    onMenuReplace: () => { },
    onMenuCommandPalette: () => { },
    onMenuQuickOpen: () => { },
    onMenuToggleTerminal: () => { },
    onMenuToggleSidebar: () => { }
};
