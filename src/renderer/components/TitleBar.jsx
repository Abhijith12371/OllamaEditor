import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Maximize2, Minimize2 } from 'lucide-react';

const TitleBar = () => {
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        if (!window.electronAPI) return;

        // Check initial state
        window.electronAPI.isMaximized().then(setIsMaximized);

        // Listen for maximize changes
        window.electronAPI.onWindowMaximized((maximized) => {
            setIsMaximized(maximized);
        });
    }, []);

    const handleMinimize = () => window.electronAPI?.minimize();
    const handleMaximize = () => window.electronAPI?.maximize();
    const handleClose = () => window.electronAPI?.close();

    const MenuButton = ({ label, items }) => {
        const [isOpen, setIsOpen] = useState(false);

        return (
            <div className="relative">
                <button
                    className="px-3 py-1 text-xs hover:bg-[#3c3c3c] rounded-sm transition-colors"
                    onClick={() => setIsOpen(!isOpen)}
                    onBlur={() => setTimeout(() => setIsOpen(false), 150)}
                >
                    {label}
                </button>
                {isOpen && (
                    <div className="absolute top-full left-0 mt-0.5 bg-[#252526] border border-[#454545] rounded-sm shadow-lg py-1 min-w-[200px] z-50">
                        {items.map((item, idx) => (
                            item.separator ? (
                                <div key={idx} className="border-t border-[#454545] my-1" />
                            ) : (
                                <button
                                    key={idx}
                                    className="w-full px-4 py-1.5 text-left text-xs hover:bg-[#094771] flex justify-between items-center"
                                    onClick={() => {
                                        item.action?.();
                                        setIsOpen(false);
                                    }}
                                >
                                    <span>{item.label}</span>
                                    {item.shortcut && (
                                        <span className="text-gray-500 ml-8">{item.shortcut}</span>
                                    )}
                                </button>
                            )
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const fileMenu = [
        { label: 'New File', shortcut: 'Ctrl+N' },
        { label: 'New Window', shortcut: 'Ctrl+Shift+N' },
        { separator: true },
        { label: 'Open File...', shortcut: 'Ctrl+O' },
        { label: 'Open Folder...', shortcut: 'Ctrl+K Ctrl+O', action: () => window.electronAPI?.openFolder() },
        { separator: true },
        { label: 'Save', shortcut: 'Ctrl+S' },
        { label: 'Save As...', shortcut: 'Ctrl+Shift+S' },
        { separator: true },
        { label: 'Exit', shortcut: 'Alt+F4', action: () => handleClose() }
    ];

    const editMenu = [
        { label: 'Undo', shortcut: 'Ctrl+Z' },
        { label: 'Redo', shortcut: 'Ctrl+Y' },
        { separator: true },
        { label: 'Cut', shortcut: 'Ctrl+X' },
        { label: 'Copy', shortcut: 'Ctrl+C' },
        { label: 'Paste', shortcut: 'Ctrl+V' },
        { separator: true },
        { label: 'Find', shortcut: 'Ctrl+F' },
        { label: 'Replace', shortcut: 'Ctrl+H' }
    ];

    const viewMenu = [
        { label: 'Command Palette...', shortcut: 'Ctrl+Shift+P' },
        { label: 'Open View...', shortcut: 'Ctrl+Q' },
        { separator: true },
        { label: 'Explorer', shortcut: 'Ctrl+Shift+E' },
        { label: 'Search', shortcut: 'Ctrl+Shift+F' },
        { separator: true },
        { label: 'Terminal', shortcut: 'Ctrl+`' },
        { label: 'Problems', shortcut: 'Ctrl+Shift+M' },
        { separator: true },
        { label: 'Toggle Sidebar', shortcut: 'Ctrl+B' }
    ];

    const helpMenu = [
        { label: 'Welcome' },
        { label: 'Documentation' },
        { separator: true },
        { label: 'About' }
    ];

    return (
        <div className="h-8 bg-[#323233] flex items-center justify-between select-none shrink-0 border-b border-[#252526]" style={{ WebkitAppRegion: 'drag' }}>
            {/* Left: Menu buttons */}
            <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' }}>
                <div className="w-10 h-full flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 100 100">
                        <polygon fill="#0078d4" points="0,0 50,0 50,50 0,50" />
                        <polygon fill="#00a4ef" points="50,0 100,0 100,50 50,50" />
                        <polygon fill="#ffb900" points="0,50 50,50 50,100 0,100" />
                        <polygon fill="#f25022" points="50,50 100,50 100,100 50,100" />
                    </svg>
                </div>
                <MenuButton label="File" items={fileMenu} />
                <MenuButton label="Edit" items={editMenu} />
                <MenuButton label="View" items={viewMenu} />
                <MenuButton label="Help" items={helpMenu} />
            </div>

            {/* Center: Title */}
            <div className="absolute left-1/2 transform -translate-x-1/2 text-xs text-gray-400">
                OllamaEditor
            </div>

            {/* Right: Window controls */}
            <div className="flex h-full" style={{ WebkitAppRegion: 'no-drag' }}>
                <button
                    className="w-12 h-full flex items-center justify-center hover:bg-[#3c3c3c] transition-colors"
                    onClick={handleMinimize}
                >
                    <Minus size={14} />
                </button>
                <button
                    className="w-12 h-full flex items-center justify-center hover:bg-[#3c3c3c] transition-colors"
                    onClick={handleMaximize}
                >
                    {isMaximized ? <Minimize2 size={12} /> : <Square size={10} />}
                </button>
                <button
                    className="w-12 h-full flex items-center justify-center hover:bg-[#e81123] transition-colors"
                    onClick={handleClose}
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
};

export default TitleBar;
