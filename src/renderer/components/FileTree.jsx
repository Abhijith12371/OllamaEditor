import React, { useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, FileJson, FileCode, FileText, Image, Music, Video, Database, Settings, Box, Plus, FilePlus, FolderPlus } from 'lucide-react';
import { useEditor } from '../contexts/EditorContext';
import clsx from 'clsx';

// File icon component based on extension
const FileIcon = ({ name, isDirectory, isOpen }) => {
    if (isDirectory) {
        return isOpen ?
            <FolderOpen size={16} className="text-yellow-500 mr-1.5 shrink-0" /> :
            <Folder size={16} className="text-yellow-500 mr-1.5 shrink-0" />;
    }

    const ext = name.split('.').pop()?.toLowerCase();

    const iconMap = {
        js: { icon: FileCode, color: 'text-yellow-400' },
        jsx: { icon: FileCode, color: 'text-blue-400' },
        ts: { icon: FileCode, color: 'text-blue-500' },
        tsx: { icon: FileCode, color: 'text-blue-400' },
        html: { icon: FileCode, color: 'text-orange-500' },
        css: { icon: FileCode, color: 'text-pink-400' },
        scss: { icon: FileCode, color: 'text-pink-500' },
        less: { icon: FileCode, color: 'text-purple-400' },
        json: { icon: FileJson, color: 'text-yellow-300' },
        xml: { icon: FileCode, color: 'text-orange-400' },
        yaml: { icon: FileText, color: 'text-red-400' },
        yml: { icon: FileText, color: 'text-red-400' },
        md: { icon: FileText, color: 'text-blue-300' },
        txt: { icon: FileText, color: 'text-gray-400' },
        png: { icon: Image, color: 'text-purple-400' },
        jpg: { icon: Image, color: 'text-purple-400' },
        jpeg: { icon: Image, color: 'text-purple-400' },
        gif: { icon: Image, color: 'text-purple-400' },
        svg: { icon: Image, color: 'text-orange-400' },
        ico: { icon: Image, color: 'text-purple-400' },
        mp3: { icon: Music, color: 'text-green-400' },
        wav: { icon: Music, color: 'text-green-400' },
        mp4: { icon: Video, color: 'text-red-400' },
        env: { icon: Settings, color: 'text-yellow-500' },
        gitignore: { icon: Settings, color: 'text-gray-500' },
        py: { icon: FileCode, color: 'text-green-400' },
        java: { icon: FileCode, color: 'text-red-500' },
        c: { icon: FileCode, color: 'text-blue-400' },
        cpp: { icon: FileCode, color: 'text-blue-500' },
        go: { icon: FileCode, color: 'text-cyan-400' },
        rs: { icon: FileCode, color: 'text-orange-500' },
        rb: { icon: FileCode, color: 'text-red-400' },
        php: { icon: FileCode, color: 'text-purple-500' },
        sql: { icon: Database, color: 'text-yellow-400' },
        db: { icon: Database, color: 'text-yellow-500' },
        lock: { icon: Box, color: 'text-gray-500' },
    };

    const config = iconMap[ext] || { icon: File, color: 'text-gray-400' };
    const IconComponent = config.icon;

    return <IconComponent size={16} className={`${config.color} mr-1.5 shrink-0`} />;
};

const FileTreeItem = ({ item, depth = 0, onCreateFile, onCreateFolder }) => {
    const [expanded, setExpanded] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const { openFile, activeFile } = useEditor();

    const handleClick = (e) => {
        e.stopPropagation();
        if (item.isDirectory) {
            setExpanded(!expanded);
        } else {
            openFile(item.path, item.name);
        }
    };

    const handleCreateFile = (e) => {
        e.stopPropagation();
        if (!expanded) setExpanded(true);
        onCreateFile(item.path);
    };

    const handleCreateFolder = (e) => {
        e.stopPropagation();
        if (!expanded) setExpanded(true);
        onCreateFolder(item.path);
    };

    return (
        <div>
            <div
                className={clsx(
                    "flex items-center py-[2px] px-2 cursor-pointer hover:bg-[#2a2d2e] select-none text-[13px] group",
                    activeFile === item.path && !item.isDirectory ? "bg-[#37373d] text-white" : "text-[#cccccc]"
                )}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onClick={handleClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div className="w-4 h-4 flex items-center justify-center mr-0.5 shrink-0">
                    {item.isDirectory && (
                        <div className="text-gray-500 group-hover:text-gray-300">
                            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </div>
                    )}
                </div>
                <FileIcon name={item.name} isDirectory={item.isDirectory} isOpen={expanded} />
                <span className="truncate flex-1">{item.name}</span>

                {/* Action buttons on hover for directories */}
                {item.isDirectory && isHovered && (
                    <div className="flex items-center gap-0.5 ml-1">
                        <button
                            className="p-0.5 hover:bg-[#4b4b4b] rounded"
                            onClick={handleCreateFile}
                            title="New File"
                        >
                            <FilePlus size={14} className="text-gray-400 hover:text-white" />
                        </button>
                        <button
                            className="p-0.5 hover:bg-[#4b4b4b] rounded"
                            onClick={handleCreateFolder}
                            title="New Folder"
                        >
                            <FolderPlus size={14} className="text-gray-400 hover:text-white" />
                        </button>
                    </div>
                )}
            </div>
            {expanded && item.children && (
                <div>
                    {item.children.map((child, index) => (
                        <FileTreeItem
                            key={child.path || index}
                            item={child}
                            depth={depth + 1}
                            onCreateFile={onCreateFile}
                            onCreateFolder={onCreateFolder}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// Inline input component for creating new files/folders
const InlineInput = ({ type, parentPath, onSubmit, onCancel }) => {
    const [value, setValue] = useState('');

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && value.trim()) {
            onSubmit(value.trim());
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    return (
        <div className="flex items-center py-[2px] px-2 text-[13px]" style={{ paddingLeft: '20px' }}>
            <div className="w-4 h-4 mr-0.5 shrink-0" />
            {type === 'file' ? (
                <File size={16} className="text-gray-400 mr-1.5 shrink-0" />
            ) : (
                <Folder size={16} className="text-yellow-500 mr-1.5 shrink-0" />
            )}
            <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={onCancel}
                autoFocus
                placeholder={type === 'file' ? 'filename.ext' : 'folder name'}
                className="flex-1 bg-[#3c3c3c] border border-[#007fd4] outline-none px-1 py-0.5 text-sm rounded-sm"
            />
        </div>
    );
};

const FileTree = () => {
    const { fileTree, currentFolder, handleOpenFolder, refreshFileTree, openFile } = useEditor();
    const [creatingIn, setCreatingIn] = useState(null); // { path: string, type: 'file' | 'folder' }

    const handleCreateFile = (parentPath) => {
        setCreatingIn({ path: parentPath || currentFolder, type: 'file' });
    };

    const handleCreateFolder = (parentPath) => {
        setCreatingIn({ path: parentPath || currentFolder, type: 'folder' });
    };

    const handleSubmitCreate = async (name) => {
        if (!window.electronAPI || !creatingIn) return;

        const fullPath = `${creatingIn.path}\\${name}`;

        try {
            if (creatingIn.type === 'file') {
                const result = await window.electronAPI.createFile(fullPath);
                if (result.success) {
                    await refreshFileTree();
                    // Open the newly created file
                    openFile(fullPath, name);
                }
            } else {
                const result = await window.electronAPI.createFolder(fullPath);
                if (result.success) {
                    await refreshFileTree();
                }
            }
        } catch (error) {
            console.error('Failed to create:', error);
        }

        setCreatingIn(null);
    };

    const handleCancelCreate = () => {
        setCreatingIn(null);
    };

    const handleRefresh = async () => {
        await refreshFileTree();
    };

    if (!currentFolder) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <Folder size={48} className="text-gray-600 mb-4" strokeWidth={1} />
                <p className="text-sm text-gray-400 mb-2">No folder opened</p>
                <button
                    className="px-4 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] text-white text-sm rounded transition-colors"
                    onClick={handleOpenFolder}
                >
                    Open Folder
                </button>
                <p className="text-xs text-gray-600 mt-4">
                    You can also use <span className="text-gray-400">Ctrl+K Ctrl+O</span>
                </p>
            </div>
        );
    }

    // Get folder name from path
    const folderName = currentFolder.split(/[\\/]/).pop();

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
            {/* Folder header with actions */}
            <div className="sticky top-0 bg-[#252526] px-2 py-1.5 flex items-center justify-between border-b border-[#1e1e1e] z-10 group">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide truncate">
                    {folderName}
                </span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        className="p-1 hover:bg-[#3c3c3c] rounded"
                        title="New File (Ctrl+N)"
                        onClick={() => handleCreateFile(currentFolder)}
                    >
                        <FilePlus size={14} />
                    </button>
                    <button
                        className="p-1 hover:bg-[#3c3c3c] rounded"
                        title="New Folder"
                        onClick={() => handleCreateFolder(currentFolder)}
                    >
                        <FolderPlus size={14} />
                    </button>
                    <button
                        className="p-1 hover:bg-[#3c3c3c] rounded"
                        title="Refresh Explorer"
                        onClick={handleRefresh}
                    >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path fillRule="evenodd" clipRule="evenodd" d="M4.681 3.064l.001-.001C5.598 2.378 6.74 2 8 2c2.69 0 4.923 2 5.239 4.598l.028.224H15l-2.5 3-2.5-3h1.747l-.013-.105C11.511 4.608 9.944 3 8 3c-1.015 0-1.923.403-2.596 1.054l-.001.001L4.681 3.064zM11.319 12.936l-.001.001C10.402 13.622 9.26 14 8 14c-2.69 0-4.923-2-5.239-4.598L2.733 9.178H1l2.5-3 2.5 3H4.253l.013.105C4.489 11.392 6.056 13 8 13c1.015 0 1.923-.403 2.596-1.054l.001-.001.722.991z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Inline input for creating at root level */}
            {creatingIn && creatingIn.path === currentFolder && (
                <InlineInput
                    type={creatingIn.type}
                    parentPath={creatingIn.path}
                    onSubmit={handleSubmitCreate}
                    onCancel={handleCancelCreate}
                />
            )}

            {/* File tree */}
            <div className="py-1 flex-1">
                {fileTree.map((item, index) => (
                    <React.Fragment key={item.path || index}>
                        <FileTreeItem
                            item={item}
                            onCreateFile={handleCreateFile}
                            onCreateFolder={handleCreateFolder}
                        />
                        {/* Show inline input after folder if creating inside it */}
                        {creatingIn && creatingIn.path === item.path && (
                            <InlineInput
                                type={creatingIn.type}
                                parentPath={creatingIn.path}
                                onSubmit={handleSubmitCreate}
                                onCancel={handleCancelCreate}
                            />
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default FileTree;
