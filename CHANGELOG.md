# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2026-04-12

### Added

- **Modular architecture**: Split monolithic `extension.js` into `src/` directory (`ui/`, `config.js`, `files.js`, `export.js`, `lang.js`, `index.js`).
- **Full "Back" navigation**: Added "Back" buttons to folder selection and file selection screens. Returning to project selection is now seamless.
- **Explicit "Exit"**: Added `🚪 Exit` option to the main menu.
- **Settings menu**: New `⚙️ Settings` section to configure:
  - Interface language
  - Default export format (TXT/PDF)
  - Token limit warning threshold
  - Global folder exclusions
  - File exclude patterns
  - Project history management
- **Token limit warnings**: Configurable token limit with a `y/n` prompt to continue if exceeded.
- **Export format choice**: Choose between Plain Text (`.txt`) and Compressed PDF (`.pdf`) on every run.
- **`y/n` confirmations**: Replaced some selection menus with `confirm` prompts (e.g., "Proceed with all folders?", "Use previous selection?", "Add to favorites?").
- **Repeat last run**: `⚡ Repeat last run` option in the main menu to instantly re-generate the prompt using previous settings.
- **Estimated tokens display**: Show estimated token counts next to folders and files during selection.
- **Folder toggles**: Select/deselect entire folders and sub-folders directly in the file picker.
- **Safe config storage**: User settings are now stored in the system's AppData/Home directory via `conf` (no more `project_prompt_config.json` clutter in projects).
- **Auto `.gitignore` update**: Automatically adds `prompt.txt` and `prompt.pdf` to the project's `.gitignore` if missing.

### Changed

- Completely rewritten UI logic for smoother navigation and state handling.
- Improved `Ctrl+C` handling: Now reliably exits the application instead of hanging or looping.
- Clipboard copy is now only attempted for `.txt` exports.
- Updated dependencies and removed unused ones (`cli-progress`, `simple-git`, etc.).

### Fixed

- Fixed "Back" button missing in file selection.
- Fixed `Ctrl+C` not closing the app during file/prompt selection.
- Fixed configuration issues when switching between multiple projects.

### Removed

- Removed monolithic `extension.js`.
