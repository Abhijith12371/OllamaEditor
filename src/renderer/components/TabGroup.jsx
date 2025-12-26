import React, { useRef, useEffect } from 'react';
import { X, Circle, FileCode, FileJson, FileText, File, Image } from 'lucide-react';
import { useEditor } from '../contexts/EditorContext';
import clsx from 'clsx';

// Get icon based on file extension
const getFileIcon = (name) => {
    const ext = name.split('.').pop()?.toLowerCase();

    const iconMap = {
        js: { icon: FileCode, color: 'text-yellow-400' },
        jsx: { icon: FileCode, color: 'text-blue-400' },
        ts: { icon: FileCode, color: 'text-blue-500' },
        tsx: { icon: FileCode, color: 'text-blue-400' },
        json: { icon: FileJson, color: 'text-yellow-300' },
        html: { icon: FileCode, color: 'text-orange-500' },
        css: { icon: FileCode, color: 'text-pink-400' },
        md: { icon: FileText, color: 'text-blue-300' },
        py: { icon: FileCode, color: 'text-green-400' },
        png: { icon: Image, color: 'text-purple-400' },
        jpg: { icon: Image, color: 'text-purple-400' },
        svg: { icon: Image, color: 'text-orange-400' },
    };

    const config = iconMap[ext] || { icon: File, color: 'text-gray-400' };
    const IconComponent = config.icon;

    return <IconComponent size={14} className={config.color} />;
};

const TabGroup = () => {
    const { openFiles, activeFile, setActiveFile, closeFile } = useEditor();
    const scrollContainer = useRef(null);

    // Scroll active tab into view
    useEffect(() => {
        if (scrollContainer.current && activeFile) {
            const activeTab = scrollContainer.current.querySelector(`[data-path="${activeFile}"]`);
            if (activeTab) {
                activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
            }
        }
    }, [activeFile]);

    if (openFiles.length === 0) return null;

    return (
        <div
            className="flex bg-[#252526] h-[35px] overflow-x-auto border-b border-[#1e1e1e] scrollbar-hide shrink-0"
            ref={scrollContainer}
        >
            {openFiles.map(file => (
                <div
                    key={file.path}
                    data-path={file.path}
                    className={clsx(
                        "group flex items-center gap-2 min-w-[120px] max-w-[200px] border-r border-[#1e1e1e] cursor-pointer select-none px-3 text-[13px]",
                        activeFile === file.path
                            ? "bg-[#1e1e1e] text-white"
                            : "bg-[#2d2d2d] text-[#969696] hover:bg-[#2a2d2e]"
                    )}
                    onClick={() => setActiveFile(file.path)}
                    onAuxClick={(e) => { if (e.button === 1) closeFile(file.path); }}
                >
                    {/* Active tab indicator */}
                    {activeFile === file.path && (
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-[#007acc]" />
                    )}

                    {/* File icon */}
                    {getFileIcon(file.name)}

                    {/* File name */}
                    <span
                        className={clsx(
                            "truncate flex-1",
                            file.isDirty ? "italic" : ""
                        )}
                        title={file.path}
                    >
                        {file.name}
                    </span>

                    {/* Close / Dirty indicator */}
                    <button
                        className={clsx(
                            "p-0.5 rounded hover:bg-[#4b4b4b] transition-opacity shrink-0",
                            file.isDirty
                                ? "opacity-100"
                                : "opacity-0 group-hover:opacity-100"
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                            closeFile(file.path);
                        }}
                    >
                        {file.isDirty ? (
                            <Circle size={8} fill="currentColor" className="text-white" />
                        ) : (
                            <X size={14} />
                        )}
                    </button>
                </div>
            ))}
        </div>
    );
};

export default TabGroup;
