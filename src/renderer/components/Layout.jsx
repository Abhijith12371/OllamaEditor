import React from 'react';
import TitleBar from './TitleBar';
import ActivityBar from './ActivityBar';
import Sidebar from './Sidebar';
import TabGroup from './TabGroup';
import Breadcrumbs from './Breadcrumbs';
import EditorArea from './EditorArea';
import StatusBar from './StatusBar';
import TerminalPanel from './TerminalPanel';
import WebPreview from './WebPreview';
import CommandPalette from './CommandPalette';
import QuickOpen from './QuickOpen';
import { useEditor } from '../contexts/EditorContext';

const Layout = () => {
    const {
        showCommandPalette,
        setShowCommandPalette,
        showQuickOpen,
        setShowQuickOpen,
        showPreview
    } = useEditor();

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e] text-[#cccccc] overflow-hidden">
            {/* Title Bar */}
            <TitleBar />

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                <ActivityBar />
                <Sidebar />
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    <TabGroup />
                    <Breadcrumbs />
                    <EditorArea />
                </div>
                <WebPreview />
            </div>

            {/* Terminal Panel */}
            <TerminalPanel />

            {/* Status Bar */}
            <StatusBar />

            {/* Modals */}
            <CommandPalette
                isOpen={showCommandPalette}
                onClose={() => setShowCommandPalette(false)}
            />
            <QuickOpen
                isOpen={showQuickOpen}
                onClose={() => setShowQuickOpen(false)}
            />
        </div>
    );
};

export default Layout;
