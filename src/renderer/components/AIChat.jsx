import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Code, FolderPlus, Copy, Check, RefreshCw, Trash2, Play, FileCode, CheckCircle2, XCircle, Terminal, ImageIcon, X } from 'lucide-react';
import { useEditor } from '../contexts/EditorContext';
import clsx from 'clsx';

const AIChat = () => {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "Hi! I'm your **Autonomous AI Agent**. I can build, run, and fix your projects automatically!\n\n🚀 **Auto-Pilot Mode:** Toggle the **BOT** icon in the header. When ON, I will:\n• **Auto-Apply** files I suggest\n• **Auto-Run** commands to start the project\n• **Auto-Fix** any terminal errors I see\n\n💡 **Tip:** Ask me to \"Create a React todo app with tailwind\" and watch me go solo!",
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [model, setModel] = useState('MHKetbi/UIGEN-T1-Qwen-7B:latest');
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [creatingFiles, setCreatingFiles] = useState(false);
    const [createdFiles, setCreatedFiles] = useState([]);
    const [pendingTerminalFix, setPendingTerminalFix] = useState(false);
    const [autoPilot, setAutoPilot] = useState(false);
    const [attachedImage, setAttachedImage] = useState(null); // { base64, mimeType, dataUrl }
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const lastSummaryRef = useRef(''); // Tracks what was just run to avoid loops
    const lastCommandRef = useRef(''); // Fallback command to re-run after fixes
    const processedFilesRef = useRef(new Set()); // Tracks "messageIndex:filename" to avoid redundant applications
    const fixRetryCountRef = useRef(0); // Track number of fix attempts to prevent infinite loops
    const MAX_FIX_RETRIES = 3; // Maximum fix attempts before stopping

    const {
        currentFolder,
        refreshFileTree,
        openFile,
        terminalOutput,
        setTerminalOutput,
        executeCommand,
        setShowTerminal,
        saveFile,
        agentStatus,
        setAgentStatus,
        fileTree,
        setShowPreview,
        setPreviewUrl
    } = useEditor();

    // Expose executeCommand to window for the onclick handler in dangerouslySetInnerHTML
    useEffect(() => {
        window.executeTerminalCommand = (cmd) => {
            setAgentStatus('executing');
            setShowTerminal(true);
            executeCommand(cmd);
            setTimeout(() => setAgentStatus(null), 3000);
        };
        return () => {
            delete window.executeTerminalCommand;
        };
    }, [executeCommand, setShowTerminal, setAgentStatus]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // NOTE: Autonomous loops are defined AFTER all helper functions to avoid hoisting issues
    const lastProcessedOutputRef = useRef('');

    // Parse code blocks with filenames from AI response
    const parseCodeBlocksWithFiles = (text) => {
        const parts = [];
        const files = [];

        // Match code blocks with optional filename in format: ```language:filename or ```filename or just ```language
        const codeBlockRegex = /```(?:(\w+):)?([^\n`]*)\n([\s\S]*?)```/g;
        let lastIndex = 0;
        let match;

        while ((match = codeBlockRegex.exec(text)) !== null) {
            // Add text before code block
            if (match.index > lastIndex) {
                const textBefore = text.slice(lastIndex, match.index);
                parts.push({ type: 'text', content: textBefore });

                // Look for filename hints in text before code block
                const filenameMatch = textBefore.match(/(?:file|create|save|filename)[:\s]+[`"']?([^\s`"'\n]+\.[a-zA-Z]+)[`"']?/i);
                if (filenameMatch) {
                    files.push({
                        filename: filenameMatch[1],
                        content: match[3].trim(),
                        language: match[1] || getLanguageFromFilename(filenameMatch[1])
                    });
                }
            }

            const language = match[1] || 'plaintext';
            const possibleFilename = match[2]?.trim();
            const code = match[3].trim();

            // Check if the second capture group looks like a filename
            let detectedFilename = null;
            if (possibleFilename && possibleFilename.includes('.')) {
                detectedFilename = possibleFilename;
            }

            // Also check for filename patterns before code block
            const textBefore = text.slice(Math.max(0, match.index - 300), match.index);
            const filePatterns = [
                // **File: `filename`**
                /\*\*File:\s*`([^`]+)`\*\*/i,
                // ### filename or ## filename
                /^(?:#+)\s+([a-zA-Z0-9_./-]+\.[a-zA-Z]+)/m,
                // Create/Update/Modify the filename file
                /(?:create|update|modify|edit)\s+(?:the\s+)?[`"']?([a-zA-Z0-9_./-]+\.[a-zA-Z]+)[`"']?\s*(?:file)?/i,
                // Step X: Create/Update filename
                /step\s*\d*[:\.]?\s*(?:create|update|modify)?\s*[`"']?([a-zA-Z0-9_./-]+\.[a-zA-Z]+)[`"']?/i,
                // filename.ext at end of line (before Apply button)
                /([a-zA-Z0-9_./-]+\.[a-zA-Z]+)\s*\n\s*Apply/i,
                // Just filename.ext on own line
                /^\s*([a-zA-Z0-9_/-]+\/[a-zA-Z0-9_.-]+\.[a-zA-Z]+)\s*$/m,
                // src/filename.ext pattern
                /(src\/[a-zA-Z0-9_./-]+\.[a-zA-Z]+)/i,
            ];

            for (const pattern of filePatterns) {
                const fm = textBefore.match(pattern);
                if (fm && !detectedFilename) {
                    detectedFilename = fm[1];
                    break;
                }
            }

            parts.push({
                type: 'code',
                language: language,
                content: code,
                filename: detectedFilename
            });



            // VALIDATION: Reject files that look like shell commands
            const isShellCommand = (
                /^(?:npm|npx|cd|git|node|yarn|pnpm)\s+/.test(code) ||
                code.trim() === 'npm run dev' ||
                code.includes('npm install')
            );

            if (detectedFilename && !files.find(f => f.filename === detectedFilename) && !isShellCommand) {
                files.push({
                    filename: detectedFilename,
                    content: code,
                    language: language
                });
            }

            lastIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (lastIndex < text.length) {
            parts.push({ type: 'text', content: text.slice(lastIndex) });
        }

        return { parts: parts.length > 0 ? parts : [{ type: 'text', content: text }], files };
    };

    const getLanguageFromFilename = (filename) => {
        const ext = filename.split('.').pop()?.toLowerCase();
        const langMap = {
            js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
            py: 'python', rb: 'ruby', java: 'java', c: 'c', cpp: 'cpp',
            html: 'html', css: 'css', scss: 'scss', json: 'json', md: 'markdown',
            sql: 'sql', sh: 'bash', yml: 'yaml', yaml: 'yaml', xml: 'xml'
        };
        return langMap[ext] || 'plaintext';
    };

    const handleCopyCode = async (code, index) => {
        await navigator.clipboard.writeText(code);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const sanitizeFilename = (filename) => {
        if (!currentFolder) return filename;
        let clean = filename.trim();

        // Remove common AI prefixes
        clean = clean.replace(/^(?:path\/to\/|project\/|workspace\/)/i, '');
        clean = clean.replace(/^[\\/]+/, '');

        // 1. Try regex based on last command (fastest)
        const createCmdMatch = lastCommandRef.current && lastCommandRef.current.match(/(?:create-react-app|vite|next-app|init)(?:@[^\s]+)?\s+([a-zA-Z0-9_-]+)/i);
        let confirmedProjectRoot = createCmdMatch ? createCmdMatch[1] : null;

        // 2. If no regex match, check File Tree for a single dominant folder
        if (!confirmedProjectRoot && fileTree && fileTree.length > 0) {
            // Filter out hidden files/folders (.git, .vscode) and loose files
            const distinctFolders = fileTree.filter(f => f.isDirectory && !f.name.startsWith('.'));

            // If there is exactly one project folder (e.g. "todo-app"), assume that is the root
            if (distinctFolders.length === 1) {
                confirmedProjectRoot = distinctFolders[0].name;
            }
        }

        // Apply redirection if we have a target folder and the file looks like it belongs there
        if (confirmedProjectRoot) {
            const isRootFile = clean.startsWith('src/') || clean.startsWith('public/') || clean === 'index.html' || clean === 'vite.config.js' || clean === 'package.json';
            const isStraySourceFile = !clean.includes('/') && /\.(jsx|css|js|ts|tsx)$/.test(clean) && !['vite.config.js', 'package.json', 'eslint.config.js', 'tailwind.config.js', 'postcss.config.js'].includes(clean);

            if (!clean.startsWith(confirmedProjectRoot)) {
                if (isRootFile) {
                    clean = `${confirmedProjectRoot}/${clean}`;
                } else if (isStraySourceFile) {
                    clean = `${confirmedProjectRoot}/src/${clean}`;
                }
            } else if (clean.startsWith(confirmedProjectRoot + '/') && !clean.includes('/src/') && !clean.includes('/public/')) {
                // Check if it's placed sequentially after project root but missing src/ like "todo-app/App.jsx"
                const subPath = clean.substring(confirmedProjectRoot.length + 1);
                if (/\.(jsx|css|tsx)$/.test(subPath) && !['tailwind.config.js', 'postcss.config.js', 'eslint.config.js'].includes(subPath)) {
                    clean = `${confirmedProjectRoot}/src/${subPath}`;
                }
            }
        }

        // Remove redundant references to the current open folder context
        const folderName = currentFolder.split(/[\\/]/).pop();
        if (clean.toLowerCase().startsWith(folderName.toLowerCase() + '/')) {
            clean = clean.substring(folderName.length + 1);
        }

        return clean;
    };

    const handleCreateFile = async (filename, content) => {
        if (!currentFolder || !window.electronAPI) {
            alert('Please open a folder first!');
            return false;
        }

        const cleanFilename = sanitizeFilename(filename);
        const fullPath = `${currentFolder}\\${cleanFilename.replace(/\//g, '\\')}`;

        try {
            await window.electronAPI.writeFile(fullPath, content);
            return true;
        } catch (error) {
            console.error('Failed to create file:', error);
            // If it failed because directory doesn't exist, try to create it relative to current folder
            return false;
        }
    };

    const handleCreateAllFiles = async (filesToCreate) => {
        if (!currentFolder) {
            alert('Please open a folder first!');
            return;
        }

        setCreatingFiles(true);
        setAgentStatus('applying');
        const results = [];
        for (const file of filesToCreate) {
            const success = await handleCreateFile(file.filename, file.content);
            results.push({ filename: file.filename, success });
        }
        setCreatedFiles(results);
        await refreshFileTree();
        setCreatingFiles(false);
        setAgentStatus(null);

        // Open the first created file
        const firstSuccess = results.find(r => r.success);
        if (firstSuccess) {
            const cleanFilename = sanitizeFilename(firstSuccess.filename);
            const fullPath = `${currentFolder}\\${cleanFilename.replace(/\//g, '\\')}`;
            openFile(fullPath, cleanFilename.split('/').pop());
        }
    };

    const fileInputRef = useRef(null);
    const lastAssistantResponseRef = useRef(''); // For loop detection

    const processImageFile = (file) => {
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            const base64 = dataUrl.split(',')[1];
            setAttachedImage({ base64, mimeType: file.type, dataUrl });
        };
        reader.readAsDataURL(file);
    };

    const handleImagePaste = useCallback((e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                processImageFile(item.getAsFile());
                return;
            }
        }
    }, []);

    const handleImageDrop = useCallback((e) => {
        e.preventDefault();
        const file = e.dataTransfer?.files?.[0];
        if (file) processImageFile(file);
    }, []);

    const sendMessage = async (overrideContent = null) => {
        const contentToSend = overrideContent || input;
        if ((!contentToSend.trim() && !attachedImage) || isLoading) return;

        const imageForMessage = attachedImage;
        const userMessage = { role: 'user', content: contentToSend || '(image attached)', image: imageForMessage?.dataUrl };
        setMessages(prev => [...prev, userMessage]);
        if (!overrideContent) {
            setInput('');
            setAttachedImage(null);
        }

        setIsLoading(true);
        // ONLY clear created files if this is a NEW task from user
        if (!overrideContent) {
            setCreatedFiles([]);
        }
        setTerminalOutput(''); // Clear terminal log for next run

        // Clear tracking for a fresh run if it's a manual user message
        if (!overrideContent) {
            processedFilesRef.current.clear();
            lastCommandRef.current = '';
            lastSummaryRef.current = '';
        }

        try {
            let systemPrompt = `You are an AUTONOMOUS CODING AGENT and SENIOR FRONTEND ENGINEER.
You CREATE files and RUN commands yourself.

WORKFLOW (STRICTLY FOLLOW THIS):
When given a task to build a new project from scratch:
1. PLAN: Output a brief technical PLAN detailing the architecture and approach.
2. TODO: Output a clear TODO LIST of files and components to create.
3. SCAFFOLD: Give the **Run:** command to scaffold the project (e.g. \`npm create vite...\`). DO NOT provide code files yet!
Wait for the terminal to succeed, then in your NEXT turn, provide the code files.

━━━━━━━━━━━━━━━━━━━━━━
CRITICAL ENVIRONMENT RULES
━━━━━━━━━━━━━━━━━━━━━━
- Project uses: Vite + React
- DO NOT use Create React App or react-scripts
- Tech Stack: React 18 + Vite + Tailwind CSS
- Preview Port: ALWAYS use 5174 (to avoid conflict with the editor)
- Dev Command: \`npm run dev -- --port 5174\`

⚠️ IMPORT RULES (READ CAREFULLY):
- ONLY import from REAL, INSTALLED packages.
- NEVER import from "@prebuiltui/react" or any fictional packages.
- NEVER invent package names. If uncertain, use only these allowed imports:
  - react, react-dom
  - framer-motion (for animations)
  - lucide-react (for icons)
  - Standard browser APIs
  - Tailwind CSS via className (no import needed)

DESIGN STANDARDS:
- AESTHETIC: Premium SaaS, Glassmorphism, Modern Clean, "Stripe-like" quality.
- COLORS: Use Tailwind: bg-slate-900, from-indigo-500 to-purple-600, etc.
- Tailwind utility classes ONLY for styling (no inline style objects or CSS files)
- Responsive, mobile-first, accessible

ALLOWED PACKAGE VERSIONS (Use these if editing package.json):
- react: ^18.2.0
- react-dom: ^18.2.0
- vite: ^5.0.0
- tailwindcss: ^3.4.1 (NEVER use v2)
- postcss: ^8.4.35
- autoprefixer: ^10.4.17
- framer-motion: ^11.0.0
- lucide-react: ^0.344.0

CRITICAL RULES FOR PROJECT CREATION:

STEP 1: SCAFFOLD ONLY
- Run the create command ONLY. IMPORTANT: Replace <project-name> with a good, short name relevant to the user request. DO NOT name everything "todo-app"!
  **Run: \`npm create vite@latest <project-name> -- --template react; cd <project-name>; npm install -D tailwindcss postcss autoprefixer; npx tailwindcss init -p; npm install; npm run dev -- --port 5174\`**
- IMPORTANT: You MUST \`cd\` into the project folder BEFORE running any \`npm\` or \`ls\` commands.
- DO NOT provide any files in this step
- Wait for the command to finish

STEP 2: MODIFY AFTER SUCCESS
- Once the project is created, provide the modified files
- IMPORTANT: If you created a subfolder, ALL file paths MUST start with that folder name!
- **CRITICAL**: You MUST provide \`tailwind.config.js\` and \`src/index.css\` (with @tailwind directives) to enable styling.
- Example: **File: \`<project-name>/src/App.jsx\`**, **File: \`<project-name>/tailwind.config.js\`**

FOR SIMPLE HTML/CSS/JS - CREATE FILES DIRECTLY:
**File: \`index.html\`**
\`\`\`html
<!DOCTYPE html>...
\`\`\`

FORMAT RULES:
1. Files: **File: \`filename\`** followed by code block
2. Commands: **Run: \`command\`** at the END of your message
3. Use ";" not "&&" for Windows/PowerShell
4. Use .jsx for React components
5. CRITICAL: NEVER put terminal commands (npm, npx, cd, git) inside a **File:** code block. Always use **Run:** for commands.

EXAMPLE - React App (Step 1):
"I'll scaffold the project using Vite and Tailwind CSS:

**Run: \`npm create vite@latest user-auth-app -- --template react; cd user-auth-app; npm install -D tailwindcss postcss autoprefixer; npx tailwindcss init -p; npm install; npm run dev -- --port 5174\`**"

EXAMPLE - React App (Step 2):
"Now updating the App component and Tailwind config:

**File: \`user-auth-app/tailwind.config.js\`**
\`\`\`javascript
/** @type {import('tailwindcss').Config} */
export default { content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"], theme: { extend: {} }, plugins: [] }
\`\`\`

**File: \`user-auth-app/src/index.css\`**
\`\`\`css
@tailwind base; @tailwind components; @tailwind utilities;
\`\`\`

**File: \`user-auth-app/src/App.jsx\`**
...code...

**Run: \`echo "Tailwind project ready!"\`**"


${currentFolder ? `Workspace: ${currentFolder}` : 'No folder open.'}

━━━━━━━━━━━━━━━━━━━━━━
CURRENT PROJECT STATE
━━━━━━━━━━━━━━━━━━━━━━
TERMINAL OUTPUT (Last 500 chars):
\`\`\`
${terminalOutput ? terminalOutput.slice(-500) : 'No output'}
\`\`\`

FILE STRUCTURE (Top Level):
\`\`\`
${fileTree ? fileTree.map(f => f.name).join('\n') : 'No files found'}
\`\`\`

**IMPORTANT: BEFORE WRITING CODE:**
1. CHECK the terminal output above. Is a server running? Is there an error?
2. CHECK the file structure. Does "todo-app" exist?
3. IF server is running on port 5173/3000, DO NOT run "npm run dev" again blindly.
4. IF you need to edit a file, make sure the path exists in the structure above.
5. IF fixing an import error, ONLY use packages listed in ALLOWED PACKAGES above.`;
            // Special override for Qwen UI Generator
            if (model === 'MHKetbi/UIGEN-T1-Qwen-7B:latest') {
                systemPrompt = `You are an expert UI generator. Create the exact UI requested by the user.
Use React and Tailwind CSS.
IMPORTANT RULES:
1. Do NOT suggest terminal commands or try to scaffold projects.
2. You MUST wrap your code output inside <|im_start|>ui and <|im_end|> tags.
3. Do NOT explain your steps, just output the code inside <|im_start|>ui ... <|im_end|>.
<|im_end|>
4. Do NOT output a plan or "thought" process. Start directly with <|im_start|>ui.

Example Format:
<|im_start|>ui
function App() { return <div className="p-4 text-center">Hello World</div>; }
export default App;
<|im_end|>`;
            }

            // Use the UPDATED messages list including the one we just added
            const chatHistory = [...messages, userMessage];

            let content;

            // Route to different APIs based on model
            if (model.startsWith('gemini')) {
                // Gemini API
                const GEMINI_API_KEY = 'AIzaSyAxQr7-GZxrPxaZudC72qeHReZxvjrKFGg';
                const geminiMessages = [
                    { role: 'user', parts: [{ text: systemPrompt }] },
                    { role: 'model', parts: [{ text: 'I understand. I am an autonomous coding agent and will follow these rules strictly.' }] },
                    ...chatHistory.filter(m => m.role !== 'system').slice(-20).map(m => ({
                        role: m.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: m.content }]
                    }))
                ];

                const geminiResponse = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: geminiMessages,
                            generationConfig: {
                                temperature: 0.2,
                                maxOutputTokens: 8192
                            }
                        })
                    }
                );

                if (!geminiResponse.ok) {
                    const errorData = await geminiResponse.json();
                    throw new Error(`Gemini error: ${errorData.error?.message || geminiResponse.status}`);
                }

                const geminiData = await geminiResponse.json();
                content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';
            } else if (model.includes('/') && (model.startsWith('qwen/') || model.startsWith('openai/'))) {
                const OPENROUTER_API_KEY = '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';
                const orMessages = [
                    { role: 'system', content: systemPrompt },
                    ...chatHistory.filter(m => m.role !== 'system')
                ];

                const orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${OPENROUTER_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: orMessages,
                        temperature: 0.2
                    })
                });

                if (!orResponse.ok) {
                    const errorData = await orResponse.json();
                    throw new Error(`OpenRouter error: ${errorData.error?.message || orResponse.status}`);
                }

                const orData = await orResponse.json();
                content = orData.choices?.[0]?.message?.content || 'Sorry, I could not generate a response from OpenRouter.';
            } else {
                if (imageForMessage) {
                    // ─── 2-STEP VISION PIPELINE ───────────────────────────────
                    // Step 1: Ask llava to describe the image in detail
                    setAgentStatus('thinking'); // show "working" indicator
                    const describeResponse = await fetch('http://localhost:11434/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: 'llava:latest',
                            messages: [{
                                role: 'user',
                                content: `Describe this UI screenshot in extreme detail. Include: layout structure, colors, fonts, spacing, all visible text, every component type (buttons, inputs, cards, navbars), icons, background, and the visual hierarchy. Be thorough — a developer will use your description to recreate this UI in code.\n\nUser instruction: ${contentToSend}`,
                                images: [imageForMessage.base64]
                            }],
                            options: { temperature: 0.1 },
                            stream: false
                        })
                    });

                    if (!describeResponse.ok) {
                        let detail = `llava error: ${describeResponse.status}`;
                        try { const j = await describeResponse.json(); if (j.error) detail = j.error; } catch (e) { }
                        throw new Error(detail);
                    }
                    const describeData = await describeResponse.json();
                    const uiDescription = describeData.message?.content || '';

                    // Step 2: Feed description to qwen2.5:7b-instruct for code generation
                    const codeSystemPrompt = `You are an expert React + Tailwind CSS developer.
You will receive a detailed description of a UI and must write the complete React code to recreate it.

STRICT RULES:
1. Output the FULL code immediately. Do NOT describe steps or explain.
2. Use this EXACT format:
**File: \`App.jsx\`**
\`\`\`jsx
...complete code...
\`\`\`
3. ONLY import from: react, react-dom, lucide-react, framer-motion. No other packages.
4. Use Tailwind CSS classes for ALL styling.
5. Make it pixel-perfect based on the description.
6. Include all visible text, icons, colors, and layout.
7. If no project exists, FIRST generate the code. If a project exists, update the App.jsx file in it.
8. AT THE END, provide a **Run:** command to start the server if not already running (e.g., **Run: \`npm run dev -- --port 5174\`**).`;

                    const codeResponse = await fetch('http://localhost:11434/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: 'qwen2.5:7b-instruct',
                            messages: [
                                { role: 'system', content: codeSystemPrompt },
                                { role: 'user', content: `Here is the UI description:\n\n${uiDescription}\n\nUser instruction: ${contentToSend}\n\nWrite the complete React + Tailwind code now.` }
                            ],
                            options: { temperature: 0.1, num_predict: 4096 },
                            stream: false
                        })
                    });

                    if (!codeResponse.ok) {
                        let detail = `qwen error: ${codeResponse.status}`;
                        try { const j = await codeResponse.json(); if (j.error) detail = j.error; } catch (e) { }
                        throw new Error(detail);
                    }
                    const codeData = await codeResponse.json();
                    content = codeData.message?.content || 'Sorry, could not generate code.';
                    setAgentStatus(null);

                } else {
                    // ─── NORMAL (NON-IMAGE) OLLAMA CALL ──────────────────────────
                    const ollamaMessages = [
                        { role: 'system', content: systemPrompt },
                        ...chatHistory.filter(m => m.role !== 'system').slice(-20)
                    ];

                    const response = await fetch('http://localhost:11434/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: model,
                            messages: ollamaMessages,
                            options: {
                                temperature: 0.1,
                                top_p: 0.9,
                                num_predict: 4096
                            },
                            stream: false
                        })
                    });

                    if (!response.ok) {
                        let errorDetail = `Status: ${response.status}`;
                        try {
                            const errorJson = await response.json();
                            if (errorJson.error) errorDetail = errorJson.error;
                        } catch (e) {
                            // Fallback if not JSON
                        }
                        throw new Error(errorDetail);
                    }

                    const data = await response.json();
                    content = data.message?.content || 'Sorry, I could not generate a response.';
                } // end else (non-image)
            }

            // Pre-process content for Qwen UIGEN or similar models that use <|im_start|>ui
            if (content.includes('<|im_start|>ui')) {
                // Strip out <|im_start|>think...<|im_end|> if present to keep UI clean
                content = content.replace(/<\|im_start\|>think[\s\S]*?<\|im_end\|>/g, '');

                content = content.replace(/<\|im_start\|>ui\s*([\s\S]*?)(?:<\|im_start\|>|$)/g, (match, code) => {
                    return `\n**File: \`App.jsx\`**\n\`\`\`jsx\n${code.trim()}\n\`\`\`\n`;
                });
            }

            // Parse files from response
            const { files } = parseCodeBlocksWithFiles(content);


            const assistantMessage = {
                role: 'assistant',
                content: content,
                detectedFiles: files
            };

            setMessages(prev => [...prev, assistantMessage]);

            // STUCK GUARD: If AI repeats the exact same fix that just failed, force it to try something else
            if (autoPilot && overrideContent && content === lastAssistantResponseRef.current) {
                console.log("Stuck Guard: Loop detected. Forcing AI to rethink.");
                const correction = "That fix was identical to your previous attempt which failed. Please rethink the issue and provide a DIFFERENT technical approach. Do not suggest the same package.json or file changes.";
                setTimeout(() => sendMessage(correction), 1000);
            }
            lastAssistantResponseRef.current = content;

            // If autoPilot is ON and this was a vision pipeline call, apply files directly here.
            // The useEffect loop skips file application while isLoading=true, so we must handle it here.
            if (files.length > 0 && currentFolder) {
                if (autoPilot || imageForMessage) {
                    setTimeout(async () => {
                        await handleCreateAllFiles(files);
                        // Pre-mark files as processed so the useEffect doesn't double-apply
                        const msgIdx = messages.length; // index of the new assistant message
                        files.forEach(f => {
                            processedFilesRef.current.add(`${msgIdx}:${sanitizeFilename(f.filename)}`);
                        });
                    }, 500);
                } else {
                    setTimeout(async () => {
                        await handleCreateAllFiles(files);
                    }, 500);
                }
            }

        } catch (error) {
            console.error('Ollama error:', error);

            let errorMessage = error.message;
            let troubleshootingTip = "";

            if (errorMessage.toLowerCase().includes('cuda') || errorMessage.toLowerCase().includes('memory') || errorMessage.toLowerCase().includes('vram')) {
                troubleshootingTip = "\n\n💡 **Troubleshooting Tip:** This looks like a GPU memory (CUDA) error. Try:\n1. Restart Ollama\n2. Close other GPU-heavy apps (Chrome, Games)\n3. Try a smaller model (e.g. `llama3.2:1b`)\n4. Switch to **⚡ Gemini** in the model dropdown above.";
            }

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `⚠️ **Ollama Error**\n\n${errorMessage}${troubleshootingTip}\n\n*Make sure Ollama is running (` + "`ollama serve`" + `) and you have the model downloaded.*`
            }]);
        } finally {
            setIsLoading(false);
            setAgentStatus(null);
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
            content: "Chat cleared! How can I help you create something?"
        }]);
        setCreatedFiles([]);
    };

    // =====================================================
    // AUTONOMOUS AUTO-PILOT LOOPS (must be after all helper functions)
    // =====================================================

    // Auto-detect Vite port from terminal output and update preview URL
    useEffect(() => {
        if (!terminalOutput) return;
        // Vite prints: "Local:   http://localhost:5174/"
        const portMatch = terminalOutput.match(/Local:\s+http:\/\/localhost:(\d+)/i);
        if (portMatch) {
            const detectedPort = portMatch[1];
            const newUrl = `http://localhost:${detectedPort}`;
            setPreviewUrl(newUrl);
            setShowPreview(true); // auto-open preview when a dev server is detected
        }
    }, [terminalOutput, setPreviewUrl, setShowPreview]);

    // Autonomous Auto-Pilot Loop - applies files and runs commands
    useEffect(() => {
        if (!autoPilot || isLoading) {
            if (!isLoading && agentStatus === 'thinking') setAgentStatus(null);
            return;
        }

        const lastMessageIndex = messages.length - 1;
        const lastMessage = messages[lastMessageIndex];
        if (!lastMessage || lastMessage.role !== 'assistant') return;

        const { files } = parseCodeBlocksWithFiles(lastMessage.content);

        // 1. Apply any new files for THIS message automatically
        const sanitizedAIProjectFiles = files.map(f => ({
            ...f,
            sanitizedName: sanitizeFilename(f.filename),
            sig: `${lastMessageIndex}:${sanitizeFilename(f.filename)}`
        }));

        const unappliedFromThisMessage = sanitizedAIProjectFiles.filter(f => !processedFilesRef.current.has(f.sig));

        if (unappliedFromThisMessage.length > 0) {
            const applyFiles = async () => {
                setAgentStatus('applying');
                const newResults = [];
                for (const file of unappliedFromThisMessage) {
                    const success = await handleCreateFile(file.filename, file.content);
                    if (success) {
                        processedFilesRef.current.add(file.sig);
                        if (!createdFiles.find(cf => cf.filename === file.sanitizedName)) {
                            newResults.push({ filename: file.sanitizedName, success: true });
                        }
                    }
                }
                if (newResults.length > 0) {
                    setCreatedFiles(prev => [...prev, ...newResults]);
                }
                await refreshFileTree();
                setAgentStatus(null);
            };
            applyFiles();
            return;
        }

        // 2. Execute any run commands automatically
        // Multiple patterns to catch various AI response formats
        let cmd = null;

        // Pattern 1: **Run: `command`** (correct format)
        const pattern1 = lastMessage.content.match(/\*\*Run:\s*`([^`]+)`\*\*/i);
        // Pattern 2: **Run: command** (no backticks)
        const pattern2 = lastMessage.content.match(/\*\*Run:\s*([^*\n]+)\*\*/i);
        // Pattern 3: **Run: `command` (missing closing **)
        const pattern3 = lastMessage.content.match(/\*\*Run:\s*`([^`]+)`/i);
        // Pattern 4: **Run: command (no backticks, no closing)
        const pattern4 = lastMessage.content.match(/\*\*Run:\s*([^\n*`]+)/i);

        if (pattern1) {
            cmd = pattern1[1].trim();
        } else if (pattern3) {
            cmd = pattern3[1].trim();
        } else if (pattern2) {
            cmd = pattern2[1].trim();
        } else if (pattern4) {
            cmd = pattern4[1].trim();
        } else {
            const lines = lastMessage.content.split('\n');
            for (let i = 0; i < lines.length; i++) {
                if (/^(?:Run|Execute|Command|Modified\s+Command|Next\s+Step):/i.test(lines[i])) {
                    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
                        const codeMatch = lines[j].match(/```(?:\w+)?\n([\s\S]+?)```/);
                        if (codeMatch) {
                            cmd = codeMatch[1].trim();
                            break;
                        }
                    }
                }
                if (cmd) break;
            }

            // If fixing mode, look for ANY terminal command
            if (!cmd && agentStatus === 'fixing') {
                const allCodeBlocks = lastMessage.content.match(/```(?:\w+)?\n([\s\S]+?)```/g);
                if (allCodeBlocks) {
                    for (const block of allCodeBlocks) {
                        const inner = block.match(/```(?:\w+)?\n([\s\S]+?)```/)[1].trim();
                        if (/^(?:npm|cd|npx|node|git|vite|pnpm|yarn|mkdir|cp|mv)\s+/m.test(inner)) {
                            cmd = inner;
                            break;
                        }
                    }
                }
            }
        }

        const currentMsgSig = `cmd:${lastMessageIndex}`;

        if (cmd && !pendingTerminalFix) {
            cmd = cmd.replace(/^PS\s+[A-Z]:\\[^>]*>\s*/i, '').trim();

            // Command sanitization - fix common issues
            // Replace && with ; for PowerShell compatibility
            cmd = cmd.replace(/\s*&&\s*/g, '; ');

            // Don't execute obviously broken commands
            const brokenPatterns = [
                /^npm\s+install;\s*$/i,  // Just "npm install;" alone
                /Unknown command/i,       // Error in the command itself
            ];

            const isBroken = brokenPatterns.some(p => p.test(cmd));
            if (isBroken) {
                console.log('Skipping broken command:', cmd);
                return;
            }

            if (!processedFilesRef.current.has(currentMsgSig)) {
                processedFilesRef.current.add(currentMsgSig);
                lastSummaryRef.current = cmd;
                lastCommandRef.current = cmd;
                setAgentStatus('executing');
                setShowTerminal(true);

                // Reset retry counter when executing a new command
                fixRetryCountRef.current = 0;

                setTimeout(() => {
                    executeCommand(cmd);
                }, 500);
            }
        } else if (agentStatus === 'fixing' && unappliedFromThisMessage.length === 0 && !isLoading) {
            if (!processedFilesRef.current.has(currentMsgSig)) {
                processedFilesRef.current.add(currentMsgSig);
                if (lastCommandRef.current) {
                    const autoCmd = lastCommandRef.current;
                    lastSummaryRef.current = autoCmd;
                    setAgentStatus('executing');
                    setShowTerminal(true);
                    setTimeout(() => { executeCommand(autoCmd); }, 500);
                } else {
                    sendMessage("Your previous response didn't include a command to run/test the fix. Please provide the exact terminal command to proceed.");
                }
            }
        }
    }, [messages, autoPilot, isLoading, createdFiles, pendingTerminalFix, agentStatus, parseCodeBlocksWithFiles, sanitizeFilename, handleCreateFile, refreshFileTree, executeCommand, setShowTerminal, setAgentStatus, sendMessage]);

    // Terminal Error/Success Detection Loop
    useEffect(() => {
        if (!terminalOutput || !terminalOutput.trim()) return;
        if (isLoading) return;

        const outputSig = terminalOutput.slice(-200);
        if (outputSig === lastProcessedOutputRef.current) return;

        const errorKeywords = [
            'Error:', 'FAILED', 'invalid', 'Exception', 'not found', 'ReferenceError',
            'TypeError', 'unexpected', 'failed to compile', 'not recognized',
            'ERR!', 'command not found', 'no such file', 'cannot find module',
            'The token \'&&\' is not a valid statement separator'
        ];

        const hasError = errorKeywords.some(keyword => {
            const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            const found = regex.test(terminalOutput);
            if (found) {
                // False positive filters: 
                // 1. Ignore "y : The term 'y' is not recognized" (from our interrupt script)
                if (terminalOutput.match(/y\s*:\s*(?:The term 'y' is|command not found)/i)) return false;

                // 2. Ignore junk characters like [?25h
                if (terminalOutput.match(/\[\?25[hl]/i) && !terminalOutput.toLowerCase().includes('error')) {
                    return false;
                }
                return true;
            }
            return false;
        }) || (terminalOutput.includes('exited with code') && !terminalOutput.includes('exited with code 0'));

        // DETECT WRONG DIRECTORY (package.json not found)
        const isWrongDir = terminalOutput.includes('enoent Could not read package.json');
        if (isWrongDir) {
            lastProcessedOutputRef.current = outputSig;
            setAgentStatus('fixing');
            const correction = `ERROR: You are running an npm command in the WRONG FOLDER. I cannot find package.json in the current working directory.\n\nFILE STRUCTURE:\n${fileTree ? fileTree.map(f => f.name).join('\n') : 'Unknown'}\n\nPLEASE: Check which folder you created (e.g. "todo-app") and use **Run: \`cd folder-name; npm install\`** or similar.`;
            setAgentStatus('thinking');
            sendMessage(correction);
            return;
        }

        const successKeywords = [
            'Local:   http://localhost',
            'ready in',
            'Compiled successfully',
            'Project is live',
            'Done. Now run:',
            'Scaffolding project in'
        ];

        const hasSuccess = successKeywords.some(keyword => terminalOutput.includes(keyword)) || (terminalOutput.includes('Done') && terminalOutput.includes('npm install'));

        if (hasError) {
            lastProcessedOutputRef.current = outputSig;

            // Check retry limit to prevent infinite loops
            fixRetryCountRef.current += 1;
            if (fixRetryCountRef.current > MAX_FIX_RETRIES) {
                setAgentStatus(null);
                setTerminalOutput('');
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `⚠️ **Auto-fix limit reached** (${MAX_FIX_RETRIES} attempts)\n\nI've tried to fix this error ${MAX_FIX_RETRIES} times but it keeps failing. Please:\n1. Check the terminal output manually\n2. Fix the issue yourself or ask me with more details\n3. Try a fresh project in a new folder\n\nThe error seems to be a fundamental project setup issue.`
                }]);
                return;
            }

            setAgentStatus('fixing');
            lastSummaryRef.current = '';

            if (autoPilot) {
                const errorMsg = `Fix this terminal error (attempt ${fixRetryCountRef.current}/${MAX_FIX_RETRIES}):\n\`\`\`\n${terminalOutput.slice(-1000)}\n\`\`\`\n\nIMPORTANT: Provide the COMPLETE fixed file using **File: \`path\`** format, then **Run: \`command\`**. Do NOT give instructions.`;
                setAgentStatus('thinking');
                setTerminalOutput('');
                sendMessage(errorMsg);
            } else {
                setPendingTerminalFix(true);
                setInput(`Fix this terminal error:\n\`\`\`\n${terminalOutput.slice(-1500)}\n\`\`\``);
                setTerminalOutput('');
            }
        } else if (hasSuccess && agentStatus === 'executing') {
            // Reset retry counter on success
            fixRetryCountRef.current = 0;

            if (autoPilot) {
                setAgentStatus('verified');

                // AUTO-PREVIEW: If server started, open the preview
                if (terminalOutput.includes('Local:')) {
                    const match = terminalOutput.match(/Local:\s+(http:\/\/localhost:\d+)/);
                    if (match) {
                        setPreviewUrl(match[1]);
                        setShowPreview(true);
                    } else {
                        // Default fallback
                        setPreviewUrl('http://localhost:5173');
                        setShowPreview(true);
                    }
                }

                // DETECT PROJECT CREATION
                let projectContextMsg = "";
                const createMatch = lastCommandRef.current && lastCommandRef.current.match(/(?:create-react-app|vite|next-app|init)(?:@[^\s]+)?\s+([a-zA-Z0-9_-]+)/i);
                if (createMatch) {
                    const createdProject = createMatch[1];
                    refreshFileTree(); // Force verify files exist
                    projectContextMsg = `\n\n🚨 **CRITICAL: PROJECT CREATED** 🚨\nYou just created the folder "${createdProject}".\nYOU MUST WRITE ALL FILES INTO THIS FOLDER.\n\nCORRECT: **File: \`${createdProject}/src/App.jsx\`**\nWRONG: **File: \`src/App.jsx\`**`;
                }

                const successMsg = `Terminal indicates success:\n\`\`\`\n${terminalOutput.slice(-500)}\n\`\`\`\n\nIMPORTANT: If you just scaffolded a project, provide the code files for the website now (use the exact correct paths).${projectContextMsg}\n\nIf the user's request is FULLY completed, say "Task Completed".`;
                setTerminalOutput('');
                sendMessage(successMsg);
            } else {
                setAgentStatus(null);
            }
        }
    }, [terminalOutput, autoPilot, isLoading, agentStatus, setAgentStatus, setTerminalOutput, sendMessage, setShowPreview, setPreviewUrl]);

    const renderMessage = (message, index) => {
        const isUser = message.role === 'user';
        const { parts, files } = parseCodeBlocksWithFiles(message.content);

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
                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
                        {isUser ? 'You' : 'Ollama AI'}
                        {!isUser && files.length > 0 && (
                            <span className="bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded text-[10px]">
                                {files.length} file{files.length > 1 ? 's' : ''} detected
                            </span>
                        )}
                    </div>

                    {/* Attached image in user bubble */}
                    {isUser && message.image && (
                        <img
                            src={message.image}
                            alt="attached"
                            className="max-w-[200px] max-h-[150px] rounded mb-2 border border-[#3c3c3c] object-contain"
                        />
                    )}

                    <div className="text-sm text-[#cccccc] space-y-2">
                        {parts.map((part, partIndex) => {
                            if (part.type === 'code') {
                                const codeIndex = `${index}-${partIndex}`;
                                const sanitizedPartFilename = part.filename ? sanitizeFilename(part.filename) : null;
                                const isApplied = sanitizedPartFilename && createdFiles.some(f => f.filename === sanitizedPartFilename && f.success);
                                return (
                                    <div key={partIndex} className="relative group">
                                        <div className="flex items-center justify-between bg-[#1e1e1e] px-3 py-1.5 rounded-t border border-b-0 border-[#3c3c3c]">
                                            <div className="flex items-center gap-2">
                                                <FileCode size={12} className="text-gray-500" />
                                                <span className="text-xs text-gray-400">
                                                    {part.filename || part.language}
                                                </span>
                                                {sanitizedPartFilename && isApplied && (
                                                    <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                        <Check size={10} /> Applied
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    className="p-1 hover:bg-[#3c3c3c] rounded text-gray-400 hover:text-white"
                                                    onClick={() => handleCopyCode(part.content, codeIndex)}
                                                    title="Copy code"
                                                >
                                                    {copiedIndex === codeIndex ? <Check size={12} /> : <Copy size={12} />}
                                                </button>
                                                {part.filename && currentFolder && !isApplied && (
                                                    <button
                                                        className="p-1 px-2 hover:bg-green-600 bg-green-700 rounded text-white text-[10px] flex items-center gap-1"
                                                        onClick={async () => {
                                                            const success = await handleCreateFile(part.filename, part.content);
                                                            if (success) {
                                                                await refreshFileTree();
                                                                setCreatedFiles(prev => [...prev, { filename: part.filename, success: true }]);
                                                                const fullPath = `${currentFolder}\\${part.filename.replace(/\//g, '\\')}`;
                                                                openFile(fullPath, part.filename.split('/').pop());
                                                            }
                                                        }}
                                                        title="Apply changes to file"
                                                    >
                                                        <Play size={10} /> Apply
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <pre className="bg-[#1e1e1e] p-3 rounded-b border border-t-0 border-[#3c3c3c] overflow-x-auto max-h-64">
                                            <code className="text-xs font-mono">{part.content}</code>
                                        </pre>
                                    </div>
                                );
                            }
                            return (
                                <div
                                    key={partIndex}
                                    className="whitespace-pre-wrap"
                                    dangerouslySetInnerHTML={{
                                        __html: part.content
                                            .replace(/\*\*File:\s*`([^`]+)`\*\*/g, '<div class="flex items-center gap-2 text-blue-400 font-medium mt-3 mb-1">📄 $1</div>')
                                            .replace(/\*\*Run:\s*`([^`]+)`\*\*/gi, (match, cmd) => {
                                                return `<div class="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg my-3 flex items-center justify-between gap-3">
                                                    <div class="flex items-center gap-2 text-purple-400">
                                                        <span class="p-1.5 bg-purple-500/20 rounded"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg></span>
                                                        <code class="text-xs">${cmd}</code>
                                                    </div>
                                                    <button 
                                                        onclick="window.executeTerminalCommand('${cmd}')"
                                                        class="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold rounded flex items-center gap-1 transition-colors"
                                                    >
                                                        EXECUTE
                                                    </button>
                                                </div>`;
                                            })
                                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                            .replace(/`([^`]+)`/g, '<code class="bg-[#3c3c3c] px-1 rounded text-xs">$1</code>')
                                            .replace(/\n/g, '<br/>')
                                    }}
                                />
                            );
                        })}
                    </div>

                    {/* File Creation Status */}
                    {!isUser && files.length > 0 && createdFiles.length > 0 && (
                        <div className="mt-3 p-3 bg-[#1e1e1e] rounded border border-[#3c3c3c]">
                            <div className="text-xs font-medium text-gray-300 mb-2 flex items-center gap-2">
                                <CheckCircle2 size={14} className="text-green-400" />
                                Files Created:
                            </div>
                            <div className="space-y-1">
                                {createdFiles.map((file, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-xs">
                                        {file.success ? (
                                            <Check size={12} className="text-green-400" />
                                        ) : (
                                            <XCircle size={12} className="text-red-400" />
                                        )}
                                        <span className={file.success ? "text-gray-300" : "text-red-400"}>
                                            {file.filename}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Create Files Button */}
                    {!isUser && files.length > 0 && createdFiles.length === 0 && !creatingFiles && (
                        <button
                            className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded transition-colors"
                            onClick={() => handleCreateAllFiles(files)}
                            disabled={!currentFolder}
                        >
                            <Play size={12} />
                            Create {files.length} file{files.length > 1 ? 's' : ''} in workspace
                        </button>
                    )}

                    {creatingFiles && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                            <Loader2 size={12} className="animate-spin" />
                            Creating files...
                        </div>
                    )}
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
                    {currentFolder && (
                        <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                            auto-create enabled
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {/* Auto-Pilot Toggle */}
                    <button
                        onClick={() => setAutoPilot(!autoPilot)}
                        className={clsx(
                            "flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium transition-colors",
                            autoPilot
                                ? "bg-purple-500/20 text-purple-400 border border-purple-500/50"
                                : "bg-[#3c3c3c] text-gray-400 hover:text-gray-300 border border-transparent"
                        )}
                        title={autoPilot ? "Auto-Pilot: ON (AI will apply files and run commands)" : "Auto-Pilot: OFF"}
                    >
                        <Bot size={12} className={clsx(autoPilot && "animate-pulse")} />
                        <span>AUTO-PILOT</span>
                    </button>

                    <select
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="bg-[#3c3c3c] text-[#cccccc] text-[10px] rounded px-1.5 py-1 outline-none border border-transparent focus:border-[#007acc]"
                    >
                        <option value="gemini-1.5-pro">⚡ Gemini 1.5 Pro</option>
                        <option value="gemini-1.5-flash">⚡ Gemini 1.5 Flash</option>
                        <option value="gemini-2.0-flash">⚡ Gemini 2.0 Flash</option>
                        <option value="qwen/qwen3.6-plus:free">🌐 OpenRouter Qwen 3.6 Plus (Free)</option>
                        <option value="qwen/qwen3-coder:free">🌐 OpenRouter Qwen 3 Coder (Free)</option>
                        <option value="MHKetbi/UIGEN-T1-Qwen-7B:latest">MHKetbi/UIGEN-T1-Qwen-7B:latest</option>
                        <option value="llava:latest">llava:latest</option>
                        <option value="qwen2.5:7b-instruct">qwen2.5:7b-instruct</option>
                        <option value="deepseek-r1:7b">deepseek-r1:7b</option>
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

            {/* No folder warning */}
            {!currentFolder && (
                <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-3 py-2 text-xs text-yellow-400 flex items-center gap-2">
                    ⚠️ Open a folder first to enable auto file creation
                </div>
            )}

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
                            Generating code...
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Agent Status & Terminal Log */}
            {agentStatus && (
                <div className="bg-[#252526] border-t border-purple-500/20 flex flex-col shrink-0">
                    <div className="bg-purple-500/10 px-3 py-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                                Agent: {agentStatus === 'applying' ? 'Applying Files' :
                                    agentStatus === 'executing' ? 'Executing Command' :
                                        agentStatus === 'fixing' ? 'Analyzing Error' :
                                            'Working...'}
                            </span>
                        </div>
                        <span className="text-[9px] text-gray-500">Agent Terminal Output</span>
                    </div>
                    {terminalOutput && (
                        <div className="px-3 py-2 bg-[#0c0c0c] max-h-40 overflow-y-auto custom-scrollbar font-mono text-[10px] text-green-500 leading-tight">
                            <pre className="whitespace-pre-wrap">{terminalOutput.slice(-500)}</pre>
                        </div>
                    )}
                </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-[#1e1e1e] bg-[#252526] shrink-0">
                {/* Image preview */}
                {attachedImage && (
                    <div className="mb-2 relative inline-block">
                        <img
                            src={attachedImage.dataUrl}
                            alt="preview"
                            className="h-16 w-auto rounded border border-[#007acc] object-contain"
                        />
                        <button
                            className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-500 rounded-full p-0.5"
                            onClick={() => setAttachedImage(null)}
                            title="Remove image"
                        >
                            <X size={10} />
                        </button>
                        <span className="block text-[9px] text-blue-400 mt-0.5">→ llava:latest</span>
                    </div>
                )}
                <div className="relative">
                    <textarea
                        ref={inputRef}
                        rows="3"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                            }
                        }}
                        onPaste={handleImagePaste}
                        onDrop={handleImageDrop}
                        onDragOver={(e) => e.preventDefault()}
                        placeholder={attachedImage ? 'Describe what you want the AI to do with this image...' : autoPilot ? 'Agent is in Auto-Pilot mode...' : 'Ask AI or paste/drop a screenshot...'}
                        className="w-full bg-[#3c3c3c] text-[#cccccc] text-xs rounded p-2 pr-16 outline-none border border-transparent focus:border-[#007acc] resize-none custom-scrollbar"
                        disabled={isLoading}
                    />
                    <div className="absolute right-2 bottom-2 flex gap-1">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-1.5 hover:bg-[#4c4c4c] text-gray-400 hover:text-blue-400 rounded transition-colors"
                            title="Attach image (or paste Ctrl+V)"
                        >
                            <ImageIcon size={14} />
                        </button>
                        <button
                            onClick={sendMessage}
                            disabled={(!input.trim() && !attachedImage) || isLoading}
                            className="p-1.5 bg-[#007acc] hover:bg-[#1177bb] disabled:bg-[#3c3c3c] disabled:text-[#888888] text-white rounded transition-colors"
                        >
                            {isLoading ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Send size={16} />
                            )}
                        </button>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => { if (e.target.files?.[0]) processImageFile(e.target.files[0]); e.target.value = ''; }}
                    />
                </div>
                <div className="text-xs text-gray-600 mt-2 text-center">
                    📎 Paste or drop screenshots • Files auto-created in workspace
                </div>
            </div>
        </div>
    );
};

export default AIChat;
