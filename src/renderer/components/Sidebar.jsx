import React from 'react';
import { useEditor } from '../contexts/EditorContext';
import FileTree from './FileTree';
import SearchSidebar from './SearchSidebar';
import AIChat from './AIChat';
import { GitBranch, Play, Puzzle, MoreHorizontal, Sparkles } from 'lucide-react';

const Sidebar = () => {
    const { activePanel, sidebarVisible, sidebarWidth } = useEditor();

    if (!sidebarVisible) return null;

    const getTitle = () => {
        switch (activePanel) {
            case 'explorer': return 'EXPLORER';
            case 'search': return 'SEARCH';
            case 'source-control': return 'SOURCE CONTROL';
            case 'run': return 'RUN AND DEBUG';
            case 'extensions': return 'EXTENSIONS';
            case 'settings': return 'SETTINGS';
            default: return 'EXPLORER';
        }
    };

    const PlaceholderPanel = ({ icon: Icon, title, description, actionLabel, onAction }) => (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <Icon size={48} className="text-gray-600 mb-4" strokeWidth={1} />
            <h3 className="text-sm text-gray-400 mb-2">{title}</h3>
            <p className="text-xs text-gray-600 mb-4">{description}</p>
            {onAction && (
                <button
                    className="px-4 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] text-white text-sm rounded transition-colors"
                    onClick={onAction}
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );

    const renderPanel = () => {
        switch (activePanel) {
            case 'explorer':
                return <FileTree />;
            case 'search':
                return <SearchSidebar />;
            case 'source-control':
                return (
                    <PlaceholderPanel
                        icon={GitBranch}
                        title="No source control providers registered"
                        description="Connect to a repository or initialize a new one."
                        actionLabel="Initialize Repository"
                        onAction={() => { }}
                    />
                );
            case 'run':
                return (
                    <PlaceholderPanel
                        icon={Play}
                        title="Run and Debug"
                        description="Configure and run your application with debugging."
                        actionLabel="Create launch.json"
                        onAction={() => { }}
                    />
                );
            case 'extensions':
                return (
                    <div className="flex flex-col h-full">
                        <div className="p-2">
                            <input
                                type="text"
                                placeholder="Search Extensions in Marketplace"
                                className="w-full bg-[#3c3c3c] text-[#cccccc] border border-[#3c3c3c] focus:border-[#007fd4] outline-none px-2 py-1 text-sm rounded-sm placeholder-gray-500"
                            />
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                            <Puzzle size={48} className="text-gray-600 mb-4" strokeWidth={1} />
                            <p className="text-xs text-gray-500">
                                Extensions marketplace coming soon
                            </p>
                        </div>
                    </div>
                );
            case 'settings':
                return (
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                        <h3 className="text-sm text-gray-300 mb-4">Settings</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Font Size</label>
                                <input
                                    type="number"
                                    defaultValue="14"
                                    className="w-full bg-[#3c3c3c] border border-[#3c3c3c] focus:border-[#007fd4] outline-none px-2 py-1 text-sm rounded-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Tab Size</label>
                                <input
                                    type="number"
                                    defaultValue="4"
                                    className="w-full bg-[#3c3c3c] border border-[#3c3c3c] focus:border-[#007fd4] outline-none px-2 py-1 text-sm rounded-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Word Wrap</label>
                                <select className="w-full bg-[#3c3c3c] border border-[#3c3c3c] focus:border-[#007fd4] outline-none px-2 py-1 text-sm rounded-sm">
                                    <option value="off">Off</option>
                                    <option value="on">On</option>
                                    <option value="wordWrapColumn">Word Wrap Column</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="minimap" defaultChecked className="accent-[#007fd4]" />
                                <label htmlFor="minimap" className="text-xs text-gray-400">Show Minimap</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="lineNumbers" defaultChecked className="accent-[#007fd4]" />
                                <label htmlFor="lineNumbers" className="text-xs text-gray-400">Show Line Numbers</label>
                            </div>
                        </div>
                    </div>
                );
            default:
                return <FileTree />;
        }
    };

    return (
        <div
            className="bg-[#252526] flex flex-col border-r border-[#1e1e1e] shrink-0 transition-all duration-200"
            style={{ width: sidebarWidth }}
        >
            {/* Header */}
            <div className="h-9 px-4 flex items-center justify-between text-xs text-[#bbbbbb] select-none shrink-0">
                <span className="font-bold uppercase tracking-wide">{getTitle()}</span>
                <div className="flex items-center gap-1">
                    <button className="p-1 hover:bg-[#3c3c3c] rounded" title="More Actions">
                        <MoreHorizontal size={14} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {renderPanel()}
            </div>
        </div>
    );
};

export default Sidebar;
