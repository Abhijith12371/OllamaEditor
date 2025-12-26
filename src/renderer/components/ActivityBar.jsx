import React from 'react';
import { Files, Search, GitBranch, Play, Puzzle, Settings } from 'lucide-react';
import { useEditor } from '../contexts/EditorContext';
import clsx from 'clsx';

const ActivityBar = () => {
    const { activePanel, setActivePanel, sidebarVisible, setSidebarVisible } = useEditor();

    const handleClick = (panel) => {
        if (activePanel === panel && sidebarVisible) {
            setSidebarVisible(false);
        } else {
            setActivePanel(panel);
            setSidebarVisible(true);
        }
    };

    const IconButton = ({ panel, icon: Icon, tooltip }) => (
        <div className="relative group">
            <button
                className={clsx(
                    "p-3 w-12 h-12 flex items-center justify-center transition-colors border-l-2",
                    activePanel === panel && sidebarVisible
                        ? "text-white border-white"
                        : "text-gray-500 hover:text-gray-300 border-transparent"
                )}
                onClick={() => handleClick(panel)}
                title={tooltip}
            >
                <Icon size={24} strokeWidth={1.5} />
            </button>
            {/* Tooltip */}
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-[#252526] text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-[#454545]">
                {tooltip}
            </div>
        </div>
    );

    return (
        <div className="w-12 bg-[#333333] flex flex-col items-center py-1 h-full z-10 shrink-0">
            <IconButton panel="explorer" icon={Files} tooltip="Explorer (Ctrl+Shift+E)" />
            <IconButton panel="search" icon={Search} tooltip="Search (Ctrl+Shift+F)" />
            <IconButton panel="source-control" icon={GitBranch} tooltip="Source Control (Ctrl+Shift+G)" />
            <IconButton panel="run" icon={Play} tooltip="Run and Debug (Ctrl+Shift+D)" />
            <IconButton panel="extensions" icon={Puzzle} tooltip="Extensions (Ctrl+Shift+X)" />
            <div className="flex-1" />
            <IconButton panel="settings" icon={Settings} tooltip="Settings (Ctrl+,)" />
        </div>
    );
};

export default ActivityBar;
