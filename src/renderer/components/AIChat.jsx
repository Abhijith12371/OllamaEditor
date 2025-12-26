import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Code, FolderPlus, Copy, Check, RefreshCw, Trash2 } from 'lucide-react';
import { useEditor } from '../contexts/EditorContext';
import clsx from 'clsx';

const AIChat = () => {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "Hi! I'm your AI coding assistant powered by Ollama. I can help you:\n\n• **Create projects** - Just describe what you want to build\n• **Generate code** - Ask me to write functions, components, etc.\n• **Explain code** - Select code and ask me to explain it\n• **Debug issues** - Describe your problem\n\nMake sure Ollama is running locally on port 11434!",
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [model, setModel] = useState('llama3.2');
    const [copiedIndex, setCopiedIndex] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const { currentFolder, refreshFileTree, openFile } = useEditor();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Parse code blocks from AI response
    const parseCodeBlocks = (text) => {
        const parts = [];
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        let lastIndex = 0;
        let match;

        while ((match = codeBlockRegex.exec(text)) !== null) {
            // Add text before code block
            if (match.index > lastIndex) {
                parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
            }
            // Add code block
            parts.push({
                type: 'code',
                language: match[1] || 'plaintext',
                content: match[2].trim()
            });
            lastIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (lastIndex < text.length) {
            parts.push({ type: 'text', content: text.slice(lastIndex) });
        }

        return parts.length > 0 ? parts : [{ type: 'text', content: text }];
    };

    // Extract file creation instructions from AI response
    const extractFileInstructions = (text) => {
        const files = [];
        // Match patterns like "Create file: filename.ext" or "File: filename.ext"
        const filePattern = /(?:Create file|File|Create|Save as|Filename)[:\s]+[`"]?([^\n`"]+\.[a-zA-Z]+)[`"]?/gi;
        let match;

        while ((match = filePattern.exec(text)) !== null) {
            files.push(match[1].trim());
        }

        return files;
    };

    const handleCopyCode = async (code, index) => {
        await navigator.clipboard.writeText(code);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleCreateFile = async (filename, content) => {
        if (!currentFolder || !window.electronAPI) {
            alert('Please open a folder first!');
            return;
        }

        const filePath = `${currentFolder}\\${filename}`;
        try {
            await window.electronAPI.createFile(filePath);
            await window.electronAPI.writeFile(filePath, content);
            await refreshFileTree();
            openFile(filePath, filename);
        } catch (error) {
            console.error('Failed to create file:', error);
        }
    };

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Build context with current folder info
            const systemPrompt = `You are an expert coding assistant in a VS Code-like editor called OllamaEditor. 
You help users create projects, write code, and solve programming problems.

When creating files, always specify the filename clearly like: "Create file: filename.ext"
When providing code, always use proper markdown code blocks with the language specified.
Be concise but helpful. Focus on practical, working code.

${currentFolder ? `Current workspace folder: ${currentFolder}` : 'No folder is currently open.'}`;

            const response = await fetch('http://localhost:11434/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...messages.filter(m => m.role !== 'system').slice(-10), // Last 10 messages for context
                        userMessage
                    ],
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`Ollama error: ${response.status}`);
            }

            const data = await response.json();
            const assistantMessage = {
                role: 'assistant',
                content: data.message?.content || 'Sorry, I could not generate a response.'
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Ollama error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `⚠️ **Error connecting to Ollama**\n\nMake sure Ollama is running:\n\`\`\`bash\nollama serve\n\`\`\`\n\nThen try a model like:\n\`\`\`bash\nollama run llama3.2\n\`\`\`\n\nError: ${error.message}`
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const clearChat = () => {
        setMessages([{
            role: 'assistant',
            content: "Chat cleared! How can I help you?"
        }]);
    };

    const renderMessage = (message, index) => {
        const isUser = message.role === 'user';
        const parts = parseCodeBlocks(message.content);

        return (
            <div
                key={index}
                className={clsx(
                    "flex gap-3 p-4",
                    isUser ? "bg-[#1e1e1e]" : "bg-[#252526]"
                )}
            >
                {/* Avatar */}
                <div className={clsx(
                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                    isUser ? "bg-[#0e639c]" : "bg-gradient-to-br from-purple-500 to-pink-500"
                )}>
                    {isUser ? <User size={14} /> : <Sparkles size={14} />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="text-xs text-gray-500 mb-1">
                        {isUser ? 'You' : 'Ollama AI'}
                    </div>
                    <div className="text-sm text-[#cccccc] space-y-2">
                        {parts.map((part, partIndex) => {
                            if (part.type === 'code') {
                                const codeIndex = `${index}-${partIndex}`;
                                return (
                                    <div key={partIndex} className="relative group">
                                        <div className="flex items-center justify-between bg-[#1e1e1e] px-3 py-1 rounded-t border border-b-0 border-[#3c3c3c]">
                                            <span className="text-xs text-gray-500">{part.language}</span>
                                            <div className="flex gap-1">
                                                <button
                                                    className="p-1 hover:bg-[#3c3c3c] rounded text-gray-400 hover:text-white"
                                                    onClick={() => handleCopyCode(part.content, codeIndex)}
                                                    title="Copy code"
                                                >
                                                    {copiedIndex === codeIndex ? <Check size={12} /> : <Copy size={12} />}
                                                </button>
                                                {currentFolder && (
                                                    <button
                                                        className="p-1 hover:bg-[#3c3c3c] rounded text-gray-400 hover:text-white"
                                                        onClick={() => {
                                                            const filename = prompt('Enter filename:', `file.${part.language}`);
                                                            if (filename) handleCreateFile(filename, part.content);
                                                        }}
                                                        title="Save as file"
                                                    >
                                                        <FolderPlus size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <pre className="bg-[#1e1e1e] p-3 rounded-b border border-t-0 border-[#3c3c3c] overflow-x-auto">
                                            <code className="text-xs font-mono">{part.content}</code>
                                        </pre>
                                    </div>
                                );
                            }
                            return (
                                <div
                                    key={partIndex}
                                    className="whitespace-pre-wrap prose prose-invert prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{
                                        __html: part.content
                                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                            .replace(/`([^`]+)`/g, '<code class="bg-[#3c3c3c] px-1 rounded text-xs">$1</code>')
                                            .replace(/\n/g, '<br/>')
                                    }}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e]">
            {/* Header */}
            <div className="h-10 bg-[#252526] flex items-center justify-between px-3 border-b border-[#1e1e1e] shrink-0">
                <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-purple-400" />
                    <span className="text-sm font-medium">Ollama AI</span>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="bg-[#3c3c3c] text-xs border-none outline-none px-2 py-1 rounded"
                    >
                        <option value="llama3.2">llama3.2</option>
                        <option value="llama3.1">llama3.1</option>
                        <option value="codellama">codellama</option>
                        <option value="mistral">mistral</option>
                        <option value="deepseek-coder">deepseek-coder</option>
                        <option value="qwen2.5-coder">qwen2.5-coder</option>
                    </select>
                    <button
                        className="p-1 hover:bg-[#3c3c3c] rounded"
                        onClick={clearChat}
                        title="Clear chat"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {messages.map((msg, idx) => renderMessage(msg, idx))}

                {isLoading && (
                    <div className="flex gap-3 p-4 bg-[#252526]">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                            <Sparkles size={14} />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Loader2 size={14} className="animate-spin" />
                            Thinking...
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-[#3c3c3c] shrink-0">
                <div className="flex items-end gap-2 bg-[#3c3c3c] rounded-lg p-2">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask me to create a project, write code, or explain something..."
                        className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-[#cccccc] placeholder-gray-500 max-h-32"
                        rows={1}
                        style={{ minHeight: '24px' }}
                    />
                    <button
                        className={clsx(
                            "p-2 rounded-lg transition-colors shrink-0",
                            input.trim() && !isLoading
                                ? "bg-[#0e639c] hover:bg-[#1177bb] text-white"
                                : "bg-[#2d2d2d] text-gray-500 cursor-not-allowed"
                        )}
                        onClick={sendMessage}
                        disabled={!input.trim() || isLoading}
                    >
                        <Send size={16} />
                    </button>
                </div>
                <div className="text-xs text-gray-600 mt-2 text-center">
                    Press Enter to send • Shift+Enter for new line
                </div>
            </div>
        </div>
    );
};

export default AIChat;
