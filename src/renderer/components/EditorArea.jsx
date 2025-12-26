import React, { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useEditor } from '../contexts/EditorContext';

const EditorArea = () => {
    const { openFiles, activeFile, updateFileContent, setCursorPosition } = useEditor();
    const editorRef = useRef(null);

    // Find active file data
    const activeFileData = openFiles.find(f => f.path === activeFile);

    const handleChange = (value) => {
        if (activeFile) {
            updateFileContent(activeFile, value);
        }
    };

    const handleEditorMount = (editor) => {
        editorRef.current = editor;

        // Track cursor position
        editor.onDidChangeCursorPosition((e) => {
            setCursorPosition({
                line: e.position.lineNumber,
                column: e.position.column
            });
        });
    };

    if (!activeFile || !activeFileData) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#1e1e1e] text-gray-500">
                <div className="text-center">
                    {/* VS Code logo style */}
                    <div className="mb-8 opacity-20">
                        <svg width="100" height="100" viewBox="0 0 100 100">
                            <polygon fill="#007acc" points="50,0 100,25 100,75 50,100 0,75 0,25" />
                            <polygon fill="#1e1e1e" points="50,10 90,30 90,70 50,90 10,70 10,30" />
                            <text x="50" y="60" fontSize="24" fill="#007acc" textAnchor="middle" fontFamily="monospace">OE</text>
                        </svg>
                    </div>
                    <p className="text-lg mb-4">Welcome to OllamaEditor</p>
                    <div className="text-sm space-y-2 text-gray-600">
                        <p><span className="text-gray-400 bg-[#2d2d2d] px-1.5 py-0.5 rounded text-xs">Ctrl+Shift+P</span> Command Palette</p>
                        <p><span className="text-gray-400 bg-[#2d2d2d] px-1.5 py-0.5 rounded text-xs">Ctrl+P</span> Quick Open File</p>
                        <p><span className="text-gray-400 bg-[#2d2d2d] px-1.5 py-0.5 rounded text-xs">Ctrl+K Ctrl+O</span> Open Folder</p>
                        <p><span className="text-gray-400 bg-[#2d2d2d] px-1.5 py-0.5 rounded text-xs">Ctrl+`</span> Toggle Terminal</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-hidden bg-[#1e1e1e]">
            <Editor
                height="100%"
                path={activeFile}
                defaultLanguage="plaintext"
                language={activeFileData.language}
                value={activeFileData.content}
                onChange={handleChange}
                onMount={handleEditorMount}
                theme="vs-dark"
                options={{
                    minimap: { enabled: true, scale: 1, showSlider: 'mouseover' },
                    fontSize: 14,
                    wordWrap: 'off',
                    automaticLayout: true,
                    padding: { top: 10 },
                    fontFamily: "'JetBrains Mono', 'Cascadia Code', Consolas, 'Courier New', monospace",
                    fontLigatures: true,
                    smoothScrolling: true,
                    cursorBlinking: 'smooth',
                    cursorSmoothCaretAnimation: 'on',
                    renderWhitespace: 'selection',
                    lineNumbers: 'on',
                    lineDecorationsWidth: 10,
                    renderLineHighlight: 'all',
                    scrollBeyondLastLine: true,
                    bracketPairColorization: { enabled: true },
                    guides: {
                        bracketPairs: true,
                        indentation: true
                    },
                    suggest: {
                        showMethods: true,
                        showFunctions: true,
                        showConstructors: true,
                        showVariables: true,
                        showClasses: true,
                        showInterfaces: true,
                        showModules: true,
                        showProperties: true,
                        showEvents: true,
                        showOperators: true,
                        showUnits: true,
                        showValues: true,
                        showConstants: true,
                        showEnums: true,
                        showEnumMembers: true,
                        showKeywords: true,
                        showWords: true,
                        showColors: true,
                        showFiles: true,
                        showReferences: true,
                        showFolders: true,
                    }
                }}
            />
        </div>
    );
};

export default EditorArea;
