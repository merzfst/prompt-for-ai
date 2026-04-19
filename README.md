# Prompt For AI

[![npm version](https://img.shields.io/npm/v/prompt-for-ai.svg)](https://www.npmjs.com/package/prompt-for-ai)
[![npm downloads](https://img.shields.io/npm/dm/prompt-for-ai.svg)](https://www.npmjs.com/package/prompt-for-ai)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

Prompt For AI is an interactive CLI tool that scans your project folder, displays its file structure, and lets you pick files to generate a ready-to-use prompt for AI models.

## Features

- 🗂️ **Browse & Select**: Navigate your project folders and pick specific files or entire directories.
- 🌳 **Tree View**: Automatically generates a clean project tree structure.
- ⚡ **Repeat Last Run**: Instantly re-generate prompts using your last configuration.
- 🔄 **Back Navigation**: Go back to any step (folder selection, file selection, project choice) without restarting.
- ⚙️ **Settings Menu**: Configure language, export format, token limits, global exclusions, and more.
- 📄 **Multiple Formats**: Export as Plain Text (`.txt`) or Compressed PDF (`.pdf`).
- 📊 **Token Estimation**: See estimated token counts in real-time while selecting files.
- 🌍 **Multilingual**: Supports English and Russian interfaces.
- 🛡️ **Smart Exclusions**: Automatically skips `node_modules`, `.git`, `dist`, and other common ignored folders.
- 📋 **Clipboard Copy**: Automatically copies the generated text prompt to your clipboard.

## Installation

Install globally via npm:

```bash
npm install -g prompt-for-ai
```

## Usage

Run the command:

```bash
create-prompt
```

### Workflow

1. **Select Language** (on first run): Choose between English and Russian.
2. **Select Project**: Pick from favorites, recent projects, browse for a folder, or enter a path manually.
3. **Folder Analysis**: Review folder sizes and choose which ones to include (or use `y/n` to include all).
4. **File Selection**: Toggle individual files, entire folders, or use quick actions ("Select all", "Only code").
5. **Export**: Choose format (`.txt` or `.pdf`).
6. **Done**: The prompt is saved to your project root (and copied to clipboard if `.txt`).

### Navigation

- Use `↩️ Back` at any step to return to the previous screen.
- Use `🚪 Exit` in the main menu to quit.
- Press `Ctrl+C` at any time to immediately exit.

## Configuration

Global settings (language, favorites, token limits, exclusions) are stored securely in your system's app data directory using [`conf`](https://github.com/sindresorhus/conf).

Per-project settings (last selected files, excluded folders) are also saved globally, so your projects stay clean.

The tool will automatically update your project's `.gitignore` to exclude generated `prompt.txt` and `prompt.pdf` files.

## License

This project uses the [ISC License](LICENSE).
