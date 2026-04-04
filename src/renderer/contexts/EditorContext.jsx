import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const EditorContext = createContext();

export const useEditor = () => useContext(EditorContext);

export const EditorProvider = ({ children }) => {
    const [fileTree, setFileTree] = useState([]);
    const [currentFolder, setCurrentFolder] = useState(null);
    const [openFiles, setOpenFiles] = useState([]); // Array of { path, name, content, language, isDirty, viewState }
    const [activeFile, setActiveFile] = useState(null);
    const [activePanel, setActivePanel] = useState('explorer'); // 'explorer', 'search', 'source-control', 'run', 'extensions', 'settings'
    const [sidebarVisible, setSidebarVisible] = useState(true);
    const [statusMessage, setStatusMessage] = useState('Ready');
    const [showTerminal, setShowTerminal] = useState(false);
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [showQuickOpen, setShowQuickOpen] = useState(false);
    const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
    const [terminalOutput, setTerminalOutput] = useState(''); // Store terminal output for AI analysis
    const [pendingCommand, setPendingCommand] = useState(null); // bridge for AI -> Terminal
    const [agentStatus, setAgentStatus] = useState(null); // 'thinking', 'applying', 'executing', 'fixing', null
    const [showPreview, setShowPreview] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('http://localhost:5174');

    const executeCommand = useCallback((command) => {
        // Use an object with a unique ID so the same command can be re-run
        // and TerminalPanel can always detect the change
        setPendingCommand({ cmd: command, id: Date.now() });
    }, []);

    // IPC Listeners
    useEffect(() => {
        if (!window.electronAPI) return;

        // Listener for menu open folder
        window.electronAPI.onMenuOpenFolder(() => {
            handleOpenFolder();
        });

        // Listener for save
        window.electronAPI.onMenuSave(() => {
            if (activeFile) saveFile(activeFile);
        });

        // Listener for toggle sidebar
        window.electronAPI.onMenuToggleSidebar(() => {
            setSidebarVisible(prev => !prev);
        });

        // Listener for toggle terminal
        window.electronAPI.onMenuToggleTerminal(() => {
            setShowTerminal(prev => !prev);
        });

        // Listener for command palette
        window.electronAPI.onMenuCommandPalette(() => {
            setShowCommandPalette(true);
        });

        // Listener for quick open
        window.electronAPI.onMenuQuickOpen(() => {
            setShowQuickOpen(true);
        });
    }, [activeFile]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Command Palette: Ctrl+Shift+P
            if (e.ctrlKey && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                setShowCommandPalette(true);
            }
            // Quick Open: Ctrl+P
            else if (e.ctrlKey && !e.shiftKey && e.key === 'p') {
                e.preventDefault();
                setShowQuickOpen(true);
            }
            // Toggle Sidebar: Ctrl+B
            else if (e.ctrlKey && e.key === 'b') {
                e.preventDefault();
                setSidebarVisible(prev => !prev);
            }
            // Toggle Terminal: Ctrl+`
            else if (e.ctrlKey && e.key === '`') {
                e.preventDefault();
                setShowTerminal(prev => !prev);
            }
            // Save: Ctrl+S
            else if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                if (activeFile) saveFile(activeFile);
            }
            // Close Tab: Ctrl+W
            else if (e.ctrlKey && e.key === 'w') {
                e.preventDefault();
                if (activeFile) closeFile(activeFile);
            }
            // AI Chat: Ctrl+Shift+I
            else if (e.ctrlKey && e.shiftKey && e.key === 'I') {
                e.preventDefault();
                setActivePanel('ai-chat');
                setSidebarVisible(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeFile]);

    const handleOpenFolder = async () => {
        if (!window.electronAPI) return;
        const result = await window.electronAPI.openFolder();
        if (result) {
            setCurrentFolder(result.path);
            setFileTree(result.tree);
            setOpenFiles([]);
            setActiveFile(null);
            setStatusMessage('Folder opened');
            setTimeout(() => setStatusMessage('Ready'), 2000);
        }
    };

    const openFile = async (path, name) => {
        if (!window.electronAPI) return;

        // Normalize path slashes for consistency
        const normalizedPath = path.replace(/\//g, '\\');

        // Check if already open (case-insensitive for Windows)
        const isAlreadyOpen = openFiles.find(f => f.path.toLowerCase() === normalizedPath.toLowerCase());
        if (isAlreadyOpen) {
            setActiveFile(isAlreadyOpen.path);
            return;
        }

        const result = await window.electronAPI.readFile(normalizedPath);
        if (result.success) {
            const ext = name.split('.').pop().toLowerCase();
            const languageMap = {
                'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
                'html': 'html', 'css': 'css', 'scss': 'scss', 'less': 'less',
                'json': 'json', 'md': 'markdown', 'py': 'python',
                'java': 'java', 'c': 'c', 'cpp': 'cpp', 'h': 'c',
                'go': 'go', 'rs': 'rust', 'rb': 'ruby', 'php': 'php',
                'sh': 'shell', 'bash': 'shell', 'zsh': 'shell',
                'yml': 'yaml', 'yaml': 'yaml', 'xml': 'xml',
                'sql': 'sql', 'graphql': 'graphql'
            };

            const newFile = {
                path: normalizedPath,
                name,
                content: result.content,
                language: languageMap[ext] || 'plaintext',
                isDirty: false
            };

            setOpenFiles(prev => {
                // Double check inside functional update to avoid race conditions
                if (prev.some(f => f.path.toLowerCase() === normalizedPath.toLowerCase())) {
                    return prev;
                }
                return [...prev, newFile];
            });
            setActiveFile(normalizedPath);
        }
    };

    const closeFile = (path) => {
        const remaining = openFiles.filter(f => f.path !== path);
        setOpenFiles(remaining);

        if (activeFile === path) {
            if (remaining.length > 0) {
                // Find the closest tab
                const closedIndex = openFiles.findIndex(f => f.path === path);
                const newIndex = Math.min(closedIndex, remaining.length - 1);
                setActiveFile(remaining[newIndex].path);
            } else {
                setActiveFile(null);
            }
        }
    };

    const updateFileContent = (path, newContent) => {
        setOpenFiles(prev => prev.map(f => {
            if (f.path === path) {
                return { ...f, content: newContent, isDirty: true };
            }
            return f;
        }));
    };

    const saveFile = async (path) => {
        if (!window.electronAPI) return;
        const file = openFiles.find(f => f.path === path);
        if (!file) return;

        const result = await window.electronAPI.writeFile(path, file.content);
        if (result.success) {
            setOpenFiles(prev => prev.map(f => f.path === path ? { ...f, isDirty: false } : f));
            setStatusMessage(`Saved ${file.name}`);
            setTimeout(() => setStatusMessage('Ready'), 2000);
        }
    };

    const refreshFileTree = async () => {
        if (!currentFolder || !window.electronAPI) return;
        const tree = await window.electronAPI.getDirectoryTree(currentFolder);
        setFileTree(tree);
    };

    return (
        <EditorContext.Provider value={{
            fileTree,
            currentFolder,
            openFiles,
            activeFile,
            activePanel,
            sidebarVisible,
            statusMessage,
            showTerminal,
            showCommandPalette,
            showQuickOpen,
            cursorPosition,
            setFileTree,
            setActivePanel,
            setSidebarVisible,
            setShowTerminal,
            setShowCommandPalette,
            setShowQuickOpen,
            setCursorPosition,
            terminalOutput,
            setTerminalOutput,
            pendingCommand,
            executeCommand,
            agentStatus,
            setAgentStatus,
            showPreview,
            setShowPreview,
            previewUrl,
            setPreviewUrl,
            handleOpenFolder,
            openFile,
            closeFile,
            setActiveFile,
            updateFileContent,
            saveFile,
            refreshFileTree
        }}>
            {children}
        </EditorContext.Provider>
    );
};
