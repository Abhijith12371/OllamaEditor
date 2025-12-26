import React, { useEffect, useRef, useState } from 'react';
import { Terminal as TerminalIcon, X, Plus, ChevronDown } from 'lucide-react';
import { useEditor } from '../contexts/EditorContext';
import clsx from 'clsx';

const TerminalPanel = () => {
    const { showTerminal, setShowTerminal, currentFolder } = useEditor();
    const [terminals, setTerminals] = useState([{ id: 1, name: 'pwsh', output: [] }]);
    const [activeTerminal, setActiveTerminal] = useState(1);
    const [inputValue, setInputValue] = useState('');
    const [commandHistory, setCommandHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const outputRef = useRef(null);
    const inputRef = useRef(null);

    const currentTerminal = terminals.find(t => t.id === activeTerminal);

    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [currentTerminal?.output]);

    useEffect(() => {
        if (showTerminal && inputRef.current) {
            inputRef.current.focus();
        }
    }, [showTerminal, activeTerminal]);

    const addLine = (text, type = 'output') => {
        setTerminals(prev => prev.map(t =>
            t.id === activeTerminal
                ? { ...t, output: [...t.output, { text, type, id: Date.now() }] }
                : t
        ));
    };

    const handleCommand = async (cmd) => {
        if (!cmd.trim()) return;

        // Add to history
        setCommandHistory(prev => [...prev.filter(c => c !== cmd), cmd]);
        setHistoryIndex(-1);

        // Show the command
        addLine(`PS ${currentFolder || '~'}> ${cmd}`, 'command');

        // Parse and execute command
        const parts = cmd.trim().split(/\s+/);
        const command = parts[0].toLowerCase();

        try {
            switch (command) {
                case 'cls':
                case 'clear':
                    setTerminals(prev => prev.map(t =>
                        t.id === activeTerminal ? { ...t, output: [] } : t
                    ));
                    break;
                case 'cd':
                    addLine('Directory change simulated (requires backend support)', 'info');
                    break;
                case 'ls':
                case 'dir':
                    if (currentFolder && window.electronAPI) {
                        const tree = await window.electronAPI.getDirectoryTree(currentFolder);
                        tree.forEach(item => {
                            const prefix = item.isDirectory ? 'd----' : '-a---';
                            addLine(`${prefix}    ${item.name}`, 'output');
                        });
                    } else {
                        addLine('No folder open', 'error');
                    }
                    break;
                case 'pwd':
                    addLine(currentFolder || 'No folder open', 'output');
                    break;
                case 'echo':
                    addLine(parts.slice(1).join(' '), 'output');
                    break;
                case 'date':
                    addLine(new Date().toString(), 'output');
                    break;
                case 'help':
                    addLine('Available commands: ls, dir, pwd, cd, clear, cls, echo, date, help', 'info');
                    addLine('Note: Full terminal requires node-pty integration', 'info');
                    break;
                default:
                    addLine(`'${command}' is not recognized. Type 'help' for available commands.`, 'error');
            }
        } catch (error) {
            addLine(`Error: ${error.message}`, 'error');
        }

        setInputValue('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleCommand(inputValue);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (commandHistory.length > 0) {
                const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
                setHistoryIndex(newIndex);
                setInputValue(commandHistory[commandHistory.length - 1 - newIndex] || '');
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex > 0) {
                const newIndex = historyIndex - 1;
                setHistoryIndex(newIndex);
                setInputValue(commandHistory[commandHistory.length - 1 - newIndex] || '');
            } else {
                setHistoryIndex(-1);
                setInputValue('');
            }
        } else if (e.key === 'l' && e.ctrlKey) {
            e.preventDefault();
            setTerminals(prev => prev.map(t =>
                t.id === activeTerminal ? { ...t, output: [] } : t
            ));
        }
    };

    const addNewTerminal = () => {
        const newId = Math.max(...terminals.map(t => t.id)) + 1;
        setTerminals(prev => [...prev, { id: newId, name: `pwsh (${newId})`, output: [] }]);
        setActiveTerminal(newId);
    };

    const closeTerminal = (id) => {
        if (terminals.length === 1) {
            setShowTerminal(false);
            return;
        }
        setTerminals(prev => prev.filter(t => t.id !== id));
        if (activeTerminal === id) {
            setActiveTerminal(terminals.find(t => t.id !== id)?.id || 1);
        }
    };

    if (!showTerminal) return null;

    return (
        <div className="h-64 bg-[#1e1e1e] border-t border-[#454545] flex flex-col shrink-0">
            {/* Header */}
            <div className="h-9 bg-[#252526] flex items-center justify-between px-2 shrink-0 border-b border-[#1e1e1e]">
                <div className="flex items-center gap-1">
                    <span className="text-xs text-[#cccccc] px-2">TERMINAL</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        className="p-1 hover:bg-[#3c3c3c] rounded"
                        onClick={addNewTerminal}
                    >
                        <Plus size={14} />
                    </button>
                    <button
                        className="p-1 hover:bg-[#3c3c3c] rounded"
                        onClick={() => setShowTerminal(false)}
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Terminal tabs */}
            <div className="h-7 bg-[#252526] flex items-center px-1 gap-1 shrink-0">
                {terminals.map(term => (
                    <div
                        key={term.id}
                        className={clsx(
                            "flex items-center gap-1 px-2 py-1 text-xs cursor-pointer rounded-t",
                            activeTerminal === term.id
                                ? "bg-[#1e1e1e] text-white"
                                : "text-gray-500 hover:text-gray-300"
                        )}
                        onClick={() => setActiveTerminal(term.id)}
                    >
                        <TerminalIcon size={12} />
                        <span>{term.name}</span>
                        <button
                            className="ml-1 p-0.5 hover:bg-[#3c3c3c] rounded opacity-0 group-hover:opacity-100"
                            onClick={(e) => { e.stopPropagation(); closeTerminal(term.id); }}
                        >
                            <X size={10} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Terminal content */}
            <div
                ref={outputRef}
                className="flex-1 overflow-y-auto custom-scrollbar p-2 font-mono text-sm"
                onClick={() => inputRef.current?.focus()}
            >
                {/* Welcome message */}
                {currentTerminal?.output.length === 0 && (
                    <div className="text-gray-500 mb-2">
                        OllamaEditor Terminal - Type 'help' for available commands
                    </div>
                )}

                {/* Output lines */}
                {currentTerminal?.output.map(line => (
                    <div
                        key={line.id}
                        className={clsx(
                            "whitespace-pre-wrap break-all",
                            line.type === 'command' && "text-[#569cd6]",
                            line.type === 'error' && "text-red-400",
                            line.type === 'info' && "text-yellow-400",
                            line.type === 'output' && "text-[#cccccc]"
                        )}
                    >
                        {line.text}
                    </div>
                ))}

                {/* Input line */}
                <div className="flex items-center text-[#569cd6]">
                    <span>PS {currentFolder || '~'}&gt;&nbsp;</span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-transparent border-none outline-none text-[#cccccc] font-mono"
                        spellCheck={false}
                    />
                </div>
            </div>
        </div>
    );
};

export default TerminalPanel;
