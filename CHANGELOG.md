# Changelog

All notable changes to the Harness Manager extension are documented here.

## 0.2.0

### Added
- **`AGENTS.md` output** — harnesses now write the cross-tool [`AGENTS.md`](https://agents.md/) standard read natively by most modern coding agents.
- **More tool targets** — instruction files are now generated for **Cline** (`.clinerules`), **Roo Code** (`.roo/rules/harness.md`), **Gemini CLI** (`GEMINI.md`), **Aider** (`CONVENTIONS.md`), and **JetBrains Junie** (`.junie/guidelines.md`), in addition to the existing Claude Code, Copilot, Cursor, and Windsurf files.
- **`harnessManager.pointerTargets` setting** — choose exactly which of the 10 supported tools receive instruction files. Leave empty to write for all.
- **Sync command** — `Harness Manager: Sync AI Instruction Files from Active Harness` regenerates all instruction files from the active harness (fixes drift or applies a changed tool selection). Also available as a toolbar button in the sidebar.
- **Reset command** — `Harness Manager: Reset AI Instruction Files (Clear Active Harness)` resets instruction files to a placeholder and deactivates the current harness.
- **Status bar item** — shows the active harness; click it to open the Harness Manager sidebar.

### Changed
- Pointer-file writing is now driven by a single target registry (`src/services/PointerTargets.ts`), making tool coverage configurable and easier to extend.
- Resetting instruction files now only touches files that already exist, instead of scattering placeholders for tools you never used.

## 0.1.7

### Fixed
- Rebuilt the published bundle so the sidebar-render fix from 0.1.6 is actually shipped.

## 0.1.6 / 0.1.5

### Fixed
- Sidebar webview showed a blank/stuck "Loading…" state because the search input was removed while `onSearch()` still referenced it, throwing inside the message handler and halting all rendering. Restored the search input and guarded the lookup.
