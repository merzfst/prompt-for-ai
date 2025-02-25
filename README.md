# Prompt For AI

Prompt For AI is an easy-to-use CLI tool that scans a project folder, shows its file structure, and helps you pick files to create a prompt.

## Features

- Navigate and choose a project folder
- See the file structure as a tree
- Pick files for the prompt with checkboxes
- Save settings for next time
- Works in English and Russian
- Skips folders like node_modules

## Installation

Install Prompt For AI globally using npm:

```bash
npm install -g prompt-for-ai
```

## Usage

Start it with:

```bash
create-prompt
```

What to do:

- Pick a language (English or Russian) on first run.
- Select your project folder.
- Look at the file tree.
- Check the files you want in the prompt.
- See the prompt in the console and find it saved as prompt.txt.

You can reuse your last folder and files if you’ve run it before.

## Configuration

Settings are saved in project_prompt_config.json. It keeps:

- Your last project folder
- Files you picked
- Language choice

The tool loads this automatically next time.

## License

This project uses the ISC License.
