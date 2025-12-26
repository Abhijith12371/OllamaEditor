import React, { useState, useEffect, useRef, useCallback } from 'react';
import { File, Clock } from 'lucide-react';
import { useEditor } from '../contexts/EditorContext';
import clsx from 'clsx';

const QuickOpen = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [allFiles, setAllFiles] = useState([]);
    const inputRef = useRef(null);
    const { currentFolder, openFile, openFiles } = useEditor();

    // Flatten file tree to get all files
    const flattenTree = useCallback((tree, files = []) => {
        for (const item of tree) {
            if (item.isDirectory && item.children) {
                flattenTree(item.children, files);
            } else if (!item.isDirectory) {
                files.push(item);
            }
        }
        return files;
    }, []);

    // Load all files when folder changes
    useEffect(() => {
        const loadFiles = async () => {
            if (!currentFolder || !window.electronAPI) return;
            const tree = await window.electronAPI.getDirectoryTree(currentFolder);
            const files = flattenTree(tree);
            setAllFiles(files);
        };
        loadFiles();
    }, [currentFolder, flattenTree]);

    // Filter files based on query with fuzzy matching
    const filteredFiles = allFiles.filter(file => {
        if (!query) return true;
        const lowerQuery = query.toLowerCase();
        const lowerName = file.name.toLowerCase();
        const lowerPath = file.path.toLowerCase();

        // Simple fuzzy: check if all characters appear in order
        let queryIdx = 0;
        for (const char of lowerName) {
            if (char === lowerQuery[queryIdx]) {
                queryIdx++;
            }
            if (queryIdx === lowerQuery.length) return true;
        }

        return lowerPath.includes(lowerQuery);
    }).slice(0, 20); // Limit results

    // Check if file is recently opened
    const isRecent = (filePath) => openFiles.some(f => f.path === filePath);

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
            setSelectedIndex(prev => Math.min(prev + 1, filteredFiles.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && filteredFiles[selectedIndex]) {
            const file = filteredFiles[selectedIndex];
            openFile(file.path, file.name);
            onClose();
        }
    }, [filteredFiles, selectedIndex, onClose, openFile]);

    // Get relative path for display
    const getRelativePath = (filePath) => {
        if (!currentFolder) return filePath;
        return filePath.replace(currentFolder, '').replace(/^[\\/]/, '');
    };

    // Get file extension icon color
    const getFileColor = (name) => {
        const ext = name.split('.').pop()?.toLowerCase();
        const colors = {
            js: 'text-yellow-400',
            jsx: 'text-blue-400',
            ts: 'text-blue-500',
            tsx: 'text-blue-400',
            css: 'text-pink-400',
            html: 'text-orange-400',
            json: 'text-yellow-300',
            md: 'text-gray-400',
            py: 'text-green-400'
        };
        return colors[ext] || 'text-gray-400';
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-center pt-[15%]" onClick={onClose}>
            <div
                className="w-[600px] bg-[#252526] border border-[#454545] rounded-md shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Input */}
                <div className="p-2 border-b border-[#454545]">
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
                        onKeyDown={handleKeyDown}
                        placeholder="Search files by name (use / to search by path)"
                        className="w-full bg-[#3c3c3c] border border-[#3c3c3c] focus:border-[#007fd4] outline-none px-3 py-2 text-sm text-[#cccccc] placeholder-gray-500 rounded-sm"
                    />
                </div>

                {/* File List */}
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    {!currentFolder ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                            Open a folder first
                        </div>
                    ) : filteredFiles.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                            No files found
                        </div>
                    ) : (
                        filteredFiles.map((file, idx) => (
                            <div
                                key={file.path}
                                className={clsx(
                                    "px-3 py-2 cursor-pointer flex items-center gap-3",
                                    idx === selectedIndex ? "bg-[#094771]" : "hover:bg-[#2a2d2e]"
                                )}
                                onClick={() => {
                                    openFile(file.path, file.name);
                                    onClose();
                                }}
                                onMouseEnter={() => setSelectedIndex(idx)}
                            >
                                <File size={16} className={getFileColor(file.name)} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-[#cccccc] truncate">{file.name}</span>
                                        {isRecent(file.path) && (
                                            <Clock size={12} className="text-gray-500 shrink-0" />
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">
                                        {getRelativePath(file.path)}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuickOpen;
