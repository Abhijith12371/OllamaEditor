# OllamaEditor

A VS Code-like code editor built with Electron.js and Monaco Editor.

![OllamaEditor Screenshot](./screenshot.png)

## Features

- 🎨 **VS Code-like Interface** - Familiar layout with activity bar, sidebar, editor area, and status bar
- 📝 **Monaco Editor** - The same powerful editor that powers VS Code
- 🗂️ **File Explorer** - Browse and manage files and folders
- 📑 **Multiple Tabs** - Open and edit multiple files with tab support
- 🔍 **Search** - Search across files in your project
- ⌨️ **Command Palette** - Quick access to all commands (Ctrl+Shift+P)
- 🚀 **Quick Open** - Quickly open files by name (Ctrl+P)
- 🌙 **Dark/Light Themes** - Multiple theme options
- 💻 **Terminal Panel** - Integrated terminal (basic)
- ⚡ **Keyboard Shortcuts** - All the shortcuts you're used to

## Installation

```bash
# Clone or navigate to the project
cd OllamaEditor

# Install dependencies
npm install

# Run in development mode
npm run dev

# Or just run
npm start
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+P` | Command Palette |
| `Ctrl+P` | Quick Open File |
| `Ctrl+S` | Save File |
| `Ctrl+B` | Toggle Sidebar |
| `Ctrl+`` ` | Toggle Terminal |
| `Ctrl+F` | Find |
| `Ctrl+H` | Find and Replace |
| `Ctrl+G` | Go to Line |
| `Ctrl+W` | Close Tab |
| `Ctrl+K Ctrl+O` | Open Folder |

## Project Structure

```
OllamaEditor/
├── package.json
├── src/
│   ├── main/
│   │   └── index.js          # Electron main process
│   ├── preload/
│   │   └── index.js          # Preload script (IPC bridge)
│   └── renderer/
│       ├── index.html        # Main HTML
│       ├── index.js          # Renderer script
│       └── styles/
│           └── main.css      # Styles
└── README.md
```

## Technology Stack

- **Electron** - Desktop application framework
- **Monaco Editor** - Code editor (same as VS Code)
- **Node.js** - File system operations

## Development

```bash
# Run with DevTools open
npm run dev
```

## Building

To build the application for production, you'll need to add electron-builder:

```bash
npm install --save-dev electron-builder
```

Then add to package.json:
```json
{
  "build": {
    "appId": "com.ollama.editor",
    "productName": "OllamaEditor",
    "directories": {
      "output": "dist"
    }
  }
}
```

## License

MIT
