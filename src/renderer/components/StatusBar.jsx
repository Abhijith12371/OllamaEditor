import React from 'react';
import { useEditor } from '../contexts/EditorContext';
import { AlertCircle, Bell, Check, GitBranch, Wifi } from 'lucide-react';

const StatusBar = () => {
    const { activeFile, openFiles, statusMessage, cursorPosition, showTerminal, setShowTerminal } = useEditor();

    // Derived state
    const activeFileData = openFiles.find(f => f.path === activeFile);
    const language = activeFileData ? activeFileData.language : 'Plain Text';
    const encoding = 'UTF-8';
    const lineEnding = 'LF';

    return (
        <footer className="bg-[#007acc] text-white text-[11px] h-[22px] flex justify-between items-center select-none shrink-0">
            {/* Left side */}
            <div className="flex items-center h-full">
                {/* Remote indicator */}
                <button className="h-full px-2 flex items-center gap-1 hover:bg-white/20 transition-colors bg-[#16825d]">
                    <Wifi size={12} />
                </button>

                {/* Git branch */}
                <button className="h-full px-2 flex items-center gap-1 hover:bg-white/20 transition-colors">
                    <GitBranch size={12} />
                    <span>main</span>
                </button>

                {/* Sync status */}
                <button className="h-full px-2 flex items-center gap-1 hover:bg-white/20 transition-colors">
                    <Check size={10} />
                </button>

                {/* Problems */}
                <button className="h-full px-2 flex items-center gap-1 hover:bg-white/20 transition-colors">
                    <AlertCircle size={12} />
                    <span>0</span>
                </button>

                {/* Status message */}
                <span className="px-2">{statusMessage}</span>
            </div>

            {/* Right side */}
            <div className="flex items-center h-full">
                {activeFile && (
                    <>
                        {/* Line & Column */}
                        <button className="h-full px-2 hover:bg-white/20 transition-colors">
                            Ln {cursorPosition.line}, Col {cursorPosition.column}
                        </button>

                        {/* Spaces */}
                        <button className="h-full px-2 hover:bg-white/20 transition-colors">
                            Spaces: 4
                        </button>

                        {/* Encoding */}
                        <button className="h-full px-2 hover:bg-white/20 transition-colors">
                            {encoding}
                        </button>

                        {/* Line ending */}
                        <button className="h-full px-2 hover:bg-white/20 transition-colors">
                            {lineEnding}
                        </button>

                        {/* Language */}
                        <button className="h-full px-2 hover:bg-white/20 transition-colors">
                            {language.charAt(0).toUpperCase() + language.slice(1)}
                        </button>
                    </>
                )}

                {/* Notifications */}
                <button className="h-full px-2 hover:bg-white/20 transition-colors">
                    <Bell size={12} />
                </button>

                {/* Layout button */}
                <button
                    className="h-full px-2 hover:bg-white/20 transition-colors flex items-center gap-1"
                    onClick={() => setShowTerminal(!showTerminal)}
                >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M0 2v12h16V2H0zm15 11H1V5h14v8zM1 4V3h14v1H1z" />
                    </svg>
                </button>
            </div>
        </footer>
    );
};

export default StatusBar;
