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
import AIChat from './AIChat';
import CommandPalette from './CommandPalette';
import QuickOpen from './QuickOpen';
import { useEditor } from '../contexts/EditorContext';

const Layout = () => {
    const {
        showCommandPalette,
        setShowCommandPalette,
        showQuickOpen,
        setShowQuickOpen,
        showPreview,
        sidebarVisible,
        sidebarWidth,
        setSidebarWidth,
        aiSidebarVisible,
        aiSidebarWidth,
        setAiSidebarWidth
    } = useEditor();

    const handleSidebarResize = (e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = sidebarWidth;

        const onMouseMove = (moveEvent) => {
            const newWidth = Math.max(150, Math.min(600, startWidth + (moveEvent.clientX - startX)));
            setSidebarWidth(newWidth);
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = 'default';
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.body.style.cursor = 'col-resize';
    };

    const handleAiSidebarResize = (e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = aiSidebarWidth;

        const onMouseMove = (moveEvent) => {
            const newWidth = Math.max(200, Math.min(800, startWidth - (moveEvent.clientX - startX)));
            setAiSidebarWidth(newWidth);
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = 'default';
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.body.style.cursor = 'col-resize';
    };

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e] text-[#cccccc] overflow-hidden select-none">
            {/* Title Bar */}
            <TitleBar />

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                <ActivityBar />

                {sidebarVisible && (
                    <>
                        <Sidebar />
                        <div
                            className="w-1 hover:bg-blue-500/50 cursor-col-resize flex-shrink-0 transition-colors z-20"
                            onMouseDown={handleSidebarResize}
                        />
                    </>
                )}

                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    <TabGroup />
                    <Breadcrumbs />
                    <EditorArea />
                </div>

                {aiSidebarVisible && (
                    <>
                        <div
                            className="w-1 hover:bg-blue-500/50 cursor-col-resize flex-shrink-0 transition-colors z-20"
                            onMouseDown={handleAiSidebarResize}
                        />
                        <div
                            className="bg-[#252526] shrink-0 overflow-hidden flex flex-col"
                            style={{ width: aiSidebarWidth }}
                        >
                            <AIChat />
                        </div>
                    </>
                )}

                {showPreview && (
                    <div className="w-[400px] border-l border-[#1e1e1e] shrink-0 flex flex-col bg-[#1e1e1e]">
                        <WebPreview />
                    </div>
                )}
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
