import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as TerminalIcon, X, Plus, Loader2, Sparkles } from 'lucide-react';
import { useEditor } from '../contexts/EditorContext';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import clsx from 'clsx';

const TerminalPanel = () => {
    const {
        showTerminal,
        setShowTerminal,
        currentFolder,
        setTerminalOutput,
        setActivePanel,
        setSidebarVisible,
        pendingCommand,
        terminalHeight,
        setTerminalHeight
    } = useEditor();

    const handleResize = (e) => {
        e.preventDefault();
        const startY = e.clientY;
        const startHeight = terminalHeight;

        const onMouseMove = (moveEvent) => {
            const newHeight = Math.max(100, Math.min(600, startHeight - (moveEvent.clientY - startY)));
            setTerminalHeight(newHeight);
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = 'default';
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.body.style.cursor = 'row-resize';
    };
    const [terminals, setTerminals] = useState([]);
    const [activeTerminal, setActiveTerminal] = useState(null);
    const [isRealTerminal, setIsRealTerminal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const terminalInstances = useRef({}); // Store xterm instances
    const fitAddons = useRef({}); // Store fit addons
    const containerRefs = useRef({}); // Store container refs
    const terminalBuffers = useRef({}); // Store terminal output for AI
    const activeTerminalRef = useRef(null);
    const terminalTimeoutRef = useRef(null);

    useEffect(() => {
        activeTerminalRef.current = activeTerminal;
    }, [activeTerminal]);

    // Handle pending command from context
    useEffect(() => {
        if (!pendingCommand) return;

        const { cmd } = pendingCommand;

        const runCmd = async () => {
            let targetId = activeTerminalRef.current;

            // If no terminal active, create one first then wait for it to be ready
            if (!targetId) {
                if (!isRealTerminal) return;
                const terminal = await createNewTerminal();
                if (!terminal) return;
                targetId = terminal.id;
                // Give the newly-created PTY extra time to initialize before writing
                await new Promise(res => setTimeout(res, 1500));
            }

            if (targetId && window.electronAPI?.terminalWrite) {
                // Send Ctrl+C to interrupt any running process first
                // Use triple Ctrl+C and follow with 'y' for Windows "Terminate batch job?" prompt
                window.electronAPI.terminalWrite(targetId, '\x03\x03\x03');
                await new Promise(res => setTimeout(res, 500));
                window.electronAPI.terminalWrite(targetId, 'y\r');
                await new Promise(res => setTimeout(res, 300));
                // Send an empty newline to ensure we have a fresh prompt
                window.electronAPI.terminalWrite(targetId, '\r');
                await new Promise(res => setTimeout(res, 200));

                // Send the actual command
                window.electronAPI.terminalWrite(targetId, cmd + '\r');
            }
        };

        runCmd();
    }, [pendingCommand, isRealTerminal]);

    // Check if real terminal is available
    useEffect(() => {
        const checkTerminal = async () => {
            if (window.electronAPI?.terminalAvailable) {
                const result = await window.electronAPI.terminalAvailable();
                setIsRealTerminal(result.available);
            }
        };
        checkTerminal();
    }, []);

    // Listen for terminal data from main process
    useEffect(() => {
        if (!window.electronAPI?.onTerminalData) return;

        const syncTerminalOutput = (id) => {
            if (activeTerminalRef.current === id) {
                setTerminalOutput(terminalBuffers.current[id] || '');
            }
        };

        const removeDataListener = window.electronAPI.onTerminalData(({ id, data }) => {
            const term = terminalInstances.current[id];
            if (term) {
                term.write(data);
            }

            if (!terminalBuffers.current[id]) terminalBuffers.current[id] = '';

            // Strip ANSI codes for cleaner AI analysis
            const cleanData = data.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/\x1b\][^\x07]*\x07/g, '');
            terminalBuffers.current[id] += cleanData;

            // Keep only last 5000 chars
            if (terminalBuffers.current[id].length > 5000) {
                terminalBuffers.current[id] = terminalBuffers.current[id].slice(-5000);
            }

            // Throttled sync to global state (max once per 300ms)
            if (!terminalTimeoutRef.current) {
                terminalTimeoutRef.current = setTimeout(() => {
                    syncTerminalOutput(id);
                    terminalTimeoutRef.current = null;
                }, 300);
            }
        });

        const removeExitListener = window.electronAPI.onTerminalExit(({ id, exitCode }) => {
            const term = terminalInstances.current[id];
            if (term) {
                const exitMsg = `\r\n\x1b[31m[Process exited with code ${exitCode}]\x1b[0m\r\n`;
                term.write(exitMsg);

                // Also ensure this is in the buffer for AI
                if (!terminalBuffers.current[id]) terminalBuffers.current[id] = '';
                terminalBuffers.current[id] += `\n[Process exited with code ${exitCode}]\n`;
                syncTerminalOutput(id);
            }
            setTerminals(prev => prev.map(t =>
                t.id === id ? { ...t, exited: true } : t
            ));
        });

        return () => {
            removeDataListener?.();
            removeExitListener?.();
            if (terminalTimeoutRef.current) clearTimeout(terminalTimeoutRef.current);
        };
    }, []);

    // Initialize xterm for a terminal
    const initXterm = useCallback((terminalId) => {
        const container = containerRefs.current[terminalId];
        if (!container || terminalInstances.current[terminalId]) return;

        const term = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
            theme: {
                background: '#0c0c0c',
                foreground: '#cccccc',
                cursor: '#ffffff',
                cursorAccent: '#000000',
                selectionBackground: '#264f78',
                black: '#000000',
                red: '#cd3131',
                green: '#0dbc79',
                yellow: '#e5e510',
                blue: '#2472c8',
                magenta: '#bc3fbc',
                cyan: '#11a8cd',
                white: '#e5e5e5',
                brightBlack: '#666666',
                brightRed: '#f14c4c',
                brightGreen: '#23d18b',
                brightYellow: '#f5f543',
                brightBlue: '#3b8eea',
                brightMagenta: '#d670d6',
                brightCyan: '#29b8db',
                brightWhite: '#ffffff'
            },
            allowProposedApi: true,
            rightClickSelectsWord: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(container);
        fitAddon.fit();

        // Handle user input
        term.onData((data) => {
            if (window.electronAPI?.terminalWrite) {
                window.electronAPI.terminalWrite(terminalId, data);
            }
        });

        // Handle resize
        term.onResize(({ cols, rows }) => {
            if (window.electronAPI?.terminalResize) {
                window.electronAPI.terminalResize(terminalId, cols, rows);
            }
        });

        // Enable copy on selection
        term.onSelectionChange(() => {
            const selection = term.getSelection();
            if (selection) {
                navigator.clipboard.writeText(selection).catch(() => { });
            }
        });

        // Handle keyboard shortcuts for copy/paste
        term.attachCustomKeyEventHandler((event) => {
            // Ctrl+Shift+C = Copy
            if (event.ctrlKey && event.shiftKey && event.key === 'C') {
                const selection = term.getSelection();
                if (selection) {
                    navigator.clipboard.writeText(selection);
                }
                return false;
            }
            // Ctrl+Shift+V = Paste
            if (event.ctrlKey && event.shiftKey && event.key === 'V') {
                navigator.clipboard.readText().then(text => {
                    if (window.electronAPI?.terminalWrite) {
                        window.electronAPI.terminalWrite(terminalId, text);
                    }
                });
                return false;
            }
            // Ctrl+C with selection = Copy (otherwise send interrupt)
            if (event.ctrlKey && event.key === 'c' && term.hasSelection()) {
                navigator.clipboard.writeText(term.getSelection());
                return false;
            }
            // Ctrl+V = Paste
            if (event.ctrlKey && event.key === 'v') {
                navigator.clipboard.readText().then(text => {
                    if (window.electronAPI?.terminalWrite) {
                        window.electronAPI.terminalWrite(terminalId, text);
                    }
                });
                return false;
            }
            return true;
        });

        terminalInstances.current[terminalId] = term;
        fitAddons.current[terminalId] = fitAddon;

        // Focus the terminal
        term.focus();

        // Initial resize
        setTimeout(() => {
            fitAddon.fit();
            if (window.electronAPI?.terminalResize) {
                window.electronAPI.terminalResize(terminalId, term.cols, term.rows);
            }
        }, 100);
    }, []);

    // Handle resize when panel size changes
    useEffect(() => {
        const handleResize = () => {
            Object.values(fitAddons.current).forEach(addon => {
                try {
                    addon?.fit();
                } catch (e) { }
            });
        };

        window.addEventListener('resize', handleResize);

        // Also fit when terminal becomes visible
        if (showTerminal && activeTerminal) {
            setTimeout(handleResize, 100);
        }

        return () => window.removeEventListener('resize', handleResize);
    }, [showTerminal, activeTerminal, terminalHeight]);

    // Initialize xterm when active terminal changes
    useEffect(() => {
        if (activeTerminal && containerRefs.current[activeTerminal]) {
            if (!terminalInstances.current[activeTerminal]) {
                initXterm(activeTerminal);
            } else {
                terminalInstances.current[activeTerminal]?.focus();
                fitAddons.current[activeTerminal]?.fit();
            }
        }
    }, [activeTerminal, initXterm]);

    // Create initial terminal when panel opens
    useEffect(() => {
        if (showTerminal && terminals.length === 0 && isRealTerminal) {
            createNewTerminal();
        }
    }, [showTerminal, isRealTerminal, terminals.length]);

    const createNewTerminal = async () => {
        if (isCreating || !isRealTerminal) return null;
        setIsCreating(true);

        try {
            if (window.electronAPI?.terminalCreate) {
                const result = await window.electronAPI.terminalCreate(currentFolder);
                if (result.success) {
                    const newTerminal = {
                        id: result.id,
                        name: `pwsh`,
                        cwd: result.cwd,
                        exited: false
                    };
                    setTerminals(prev => [...prev, newTerminal]);
                    setActiveTerminal(result.id);
                    terminalBuffers.current[result.id] = '';
                    setIsCreating(false);
                    return newTerminal;
                }
            }
        } catch (err) {
            console.error('Failed to create terminal:', err);
        }

        setIsCreating(false);
        return null;
    };

    const closeTerminal = async (id) => {
        // Clean up xterm instance
        if (terminalInstances.current[id]) {
            terminalInstances.current[id].dispose();
            delete terminalInstances.current[id];
            delete fitAddons.current[id];
            delete terminalBuffers.current[id];
        }

        // Kill the PTY process
        if (window.electronAPI?.terminalKill) {
            await window.electronAPI.terminalKill(id);
        }

        const remaining = terminals.filter(t => t.id !== id);
        setTerminals(remaining);

        if (activeTerminal === id) {
            setActiveTerminal(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
        }

        if (remaining.length === 0) {
            setShowTerminal(false);
        }
    };

    // Send terminal output to AI for error analysis
    const sendToAI = () => {
        if (activeTerminal && terminalBuffers.current[activeTerminal]) {
            const output = terminalBuffers.current[activeTerminal];
            // Get last 2000 chars (most relevant for errors)
            const recentOutput = output.slice(-2000);
            setTerminalOutput(recentOutput);
            setActivePanel('ai-chat');
            setSidebarVisible(true);
        }
    };

    if (!showTerminal) return null;

    return (
        <div
            className="bg-[#1e1e1e] border-t border-[#454545] flex flex-col shrink-0 relative"
            style={{ height: terminalHeight }}
        >
            {/* Resize Handle */}
            <div
                className="absolute top-0 left-0 right-0 h-1 hover:bg-blue-500/50 cursor-row-resize z-30 transition-colors"
                onMouseDown={handleResize}
            />
            {/* Header */}
            <div className="h-9 bg-[#252526] flex items-center justify-between px-2 shrink-0 border-b border-[#1e1e1e]">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-[#cccccc] px-2">TERMINAL</span>
                    {isRealTerminal && (
                        <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                            PTY
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        className="p-1 px-2 hover:bg-[#3c3c3c] rounded flex items-center gap-1 text-purple-400 hover:text-purple-300"
                        onClick={sendToAI}
                        title="Send output to AI for error analysis"
                    >
                        <Sparkles size={12} />
                        <span className="text-[10px]">Fix with AI</span>
                    </button>
                    <button
                        className="p-1 hover:bg-[#3c3c3c] rounded"
                        onClick={createNewTerminal}
                        disabled={isCreating || !isRealTerminal}
                        title="New Terminal"
                    >
                        {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    </button>
                    <button
                        className="p-1 hover:bg-[#3c3c3c] rounded"
                        onClick={() => setShowTerminal(false)}
                        title="Hide Terminal"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Terminal tabs */}
            {terminals.length > 0 && (
                <div className="h-7 bg-[#252526] flex items-center px-1 gap-1 shrink-0">
                    {terminals.map(term => (
                        <div
                            key={term.id}
                            className={clsx(
                                "group flex items-center gap-1 px-2 py-1 text-xs cursor-pointer rounded-sm",
                                activeTerminal === term.id
                                    ? "bg-[#1e1e1e] text-white"
                                    : "text-gray-500 hover:text-gray-300 hover:bg-[#2a2d2e]"
                            )}
                            onClick={() => setActiveTerminal(term.id)}
                        >
                            <TerminalIcon size={12} />
                            <span>{term.name}</span>
                            {term.exited && <span className="text-red-400 text-[10px]">exited</span>}
                            <button
                                className="ml-1 p-0.5 hover:bg-[#3c3c3c] rounded opacity-0 group-hover:opacity-100"
                                onClick={(e) => { e.stopPropagation(); closeTerminal(term.id); }}
                            >
                                <X size={10} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Terminal content */}
            <div className="flex-1 overflow-hidden bg-[#0c0c0c] relative">
                {!isRealTerminal ? (
                    <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                        <div className="text-center p-4">
                            <p className="mb-2">Real terminal requires app restart</p>
                            <p className="text-xs text-gray-600">Close the app and run: npm run dev</p>
                        </div>
                    </div>
                ) : terminals.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                        <p>Click + to create a new terminal</p>
                    </div>
                ) : (
                    terminals.map(term => (
                        <div
                            key={term.id}
                            ref={el => { containerRefs.current[term.id] = el; }}
                            className={clsx(
                                "absolute inset-0 p-1",
                                activeTerminal === term.id ? "block" : "hidden"
                            )}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default TerminalPanel;
