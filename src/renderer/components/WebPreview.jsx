import React, { useState } from 'react';
import { X, RefreshCw, ExternalLink, Globe } from 'lucide-react';
import { useEditor } from '../contexts/EditorContext';

const WebPreview = () => {
    const { showPreview, setShowPreview, previewUrl, setPreviewUrl } = useEditor();
    const [key, setKey] = useState(0); // To force iframe refresh

    if (!showPreview) return null;

    const refresh = () => setKey(prev => prev + 1);

    return (
        <div className="w-1/2 flex flex-col border-l border-[#3c3c3c] bg-[#1e1e1e]">
            {/* Address Bar */}
            <div className="h-9 bg-[#252526] flex items-center px-2 gap-2 border-b border-[#1e1e1e]">
                <Globe size={14} className="text-gray-400" />
                <input
                    className="flex-1 bg-[#1e1e1e] text-[#cccccc] text-xs h-6 px-2 rounded border border-transparent focus:border-[#007acc] outline-none"
                    value={previewUrl}
                    onChange={(e) => setPreviewUrl(e.target.value)}
                />
                <button onClick={refresh} className="p-1 hover:bg-[#3c3c3c] rounded text-gray-400" title="Refresh">
                    <RefreshCw size={14} />
                </button>
                <button onClick={() => window.electronAPI?.openExternal(previewUrl)} className="p-1 hover:bg-[#3c3c3c] rounded text-gray-400" title="Open in Browser">
                    <ExternalLink size={14} />
                </button>
                <button onClick={() => setShowPreview(false)} className="p-1 hover:bg-[#3c3c3c] rounded text-gray-400 hover:text-white" title="Close Preview">
                    <X size={14} />
                </button>
            </div>

            {/* Iframe */}
            <div className="flex-1 bg-white relative">
                <iframe
                    key={key}
                    src={previewUrl}
                    className="w-full h-full border-0"
                    title="Live Preview"
                />
            </div>
        </div>
    );
};

export default WebPreview;
