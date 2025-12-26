import React from 'react';
import { ChevronRight, File, Folder } from 'lucide-react';
import { useEditor } from '../contexts/EditorContext';

const Breadcrumbs = () => {
    const { activeFile, currentFolder } = useEditor();

    if (!activeFile || !currentFolder) return null;

    // Get relative path and split into parts
    const relativePath = activeFile.replace(currentFolder, '').replace(/^[\\/]/, '');
    const parts = relativePath.split(/[\\/]/);

    // Get file extension for coloring
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

    return (
        <div className="h-6 bg-[#1e1e1e] flex items-center px-3 text-xs border-b border-[#252526] overflow-x-auto scrollbar-hide shrink-0">
            {parts.map((part, idx) => {
                const isLast = idx === parts.length - 1;
                const isFolder = !isLast;

                return (
                    <React.Fragment key={idx}>
                        <button className="flex items-center gap-1 hover:bg-[#2a2d2e] px-1.5 py-0.5 rounded-sm transition-colors text-[#cccccc] hover:text-white shrink-0">
                            {isFolder ? (
                                <Folder size={12} className="text-blue-400" />
                            ) : (
                                <File size={12} className={getFileColor(part)} />
                            )}
                            <span className={isLast ? 'text-white' : ''}>{part}</span>
                        </button>
                        {!isLast && (
                            <ChevronRight size={12} className="text-gray-600 mx-0.5 shrink-0" />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default Breadcrumbs;
