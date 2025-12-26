import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor } from '../contexts/EditorContext';
import clsx from 'clsx';

const CommandPalette = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const {
        handleOpenFolder,
        setSidebarVisible,
        sidebarVisible,
        setActivePanel,
        saveFile,
        activeFile,
        setShowTerminal,
        showTerminal
    } = useEditor();

    const commands = [
        { id: 'openFolder', label: 'Open Folder', category: 'File', action: handleOpenFolder },
        { id: 'saveFile', label: 'Save', category: 'File', action: () => activeFile && saveFile(activeFile) },
        { id: 'toggleSidebar', label: 'Toggle Sidebar', category: 'View', action: () => setSidebarVisible(!sidebarVisible) },
        { id: 'showExplorer', label: 'Show Explorer', category: 'View', action: () => { setActivePanel('explorer'); setSidebarVisible(true); } },
        { id: 'showSearch', label: 'Show Search', category: 'View', action: () => { setActivePanel('search'); setSidebarVisible(true); } },
        { id: 'toggleTerminal', label: 'Toggle Terminal', category: 'View', action: () => setShowTerminal?.(!showTerminal) },
        { id: 'newFile', label: 'New File', category: 'File', action: () => { } },
        { id: 'closeEditor', label: 'Close Editor', category: 'View', action: () => { } },
        { id: 'preferences', label: 'Preferences: Open Settings', category: 'Preferences', action: () => { setActivePanel('settings'); setSidebarVisible(true); } },
        { id: 'formatDocument', label: 'Format Document', category: 'Edit', action: () => { } },
        { id: 'goToLine', label: 'Go to Line...', category: 'Go', action: () => { } },
        { id: 'goToFile', label: 'Go to File...', category: 'Go', action: () => { } },
    ];

    const filteredCommands = commands.filter(cmd =>
        cmd.label.toLowerCase().includes(query.toLowerCase()) ||
        cmd.category.toLowerCase().includes(query.toLowerCase())
    );

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            onClose();
        }
    }, [filteredCommands, selectedIndex, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-center pt-[20%]" onClick={onClose}>
            <div
                className="w-[600px] bg-[#252526] border border-[#454545] rounded-md shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Input */}
                <div className="p-2 border-b border-[#454545]">
                    <div className="flex items-center bg-[#3c3c3c] rounded-sm px-2">
                        <span className="text-yellow-400 mr-2">&gt;</span>
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a command"
                            className="flex-1 bg-transparent border-none outline-none py-2 text-sm text-[#cccccc] placeholder-gray-500"
                        />
                    </div>
                </div>

                {/* Command List */}
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                    {filteredCommands.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                            No commands found
                        </div>
                    ) : (
                        filteredCommands.map((cmd, idx) => (
                            <div
                                key={cmd.id}
                                className={clsx(
                                    "px-4 py-2 cursor-pointer flex items-center text-sm",
                                    idx === selectedIndex ? "bg-[#094771] text-white" : "hover:bg-[#2a2d2e] text-[#cccccc]"
                                )}
                                onClick={() => {
                                    cmd.action();
                                    onClose();
                                }}
                                onMouseEnter={() => setSelectedIndex(idx)}
                            >
                                <span className="text-gray-500 text-xs w-24 shrink-0">{cmd.category}</span>
                                <span>{cmd.label}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
