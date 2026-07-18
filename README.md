# Harness Manager

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/AdmiralGallade.harness-manager?label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=AdmiralGallade.harness-manager)
[![Open VSX](https://img.shields.io/open-vsx/v/AdmiralGallade/harness-manager?label=Open%20VSX)](https://open-vsx.org/extension/AdmiralGallade/harness-manager)

A lightweight VS Code, Cursor and Windsurf extension for installing and managing AI agent harnesses.

## Why use this

- Install harnesses from a GitHub repository
- Keep multiple harnesses available with optional multi-install support
- Automatically update AI agent config files for **10 tools** — including the cross-tool **`AGENTS.md`** standard, Claude Code, Copilot, Cursor, Windsurf, Cline, Roo Code, Gemini CLI, Aider, and JetBrains Junie
- Choose exactly which tools to write files for
- **Sync** or **reset** your AI instruction files at any time
- See the active harness in the status bar
- Restore previous harness states from automatic backups

## Install

1. Open a folder in VS Code
2. Open the Harness Manager sidebar
3. Select a harness and click **Install**

## Add your own harnesses

You can publish your own harness repository or upload harnesses here:

https://github.com/AdmiralGallade?tab=repositories

## Create a new harness scaffold

Use the `Harness Manager: Create Harness Scaffold` command to generate:

- `harnesses/<id>/config.json`
- `harnesses/<id>/template.yaml`
- `harnesses/<id>/README.md`
- `harnesses.json` with a register entry for the scaffold

This helps you publish a new harness repository quickly.

## Configuration

- `harnessManager.githubRepo` — GitHub repo to load harnesses from (`owner/repo`)
- `harnessManager.pointerTargets` — which AI tools to generate instruction files for (leave empty for all)
- `harnessManager.defaultCreateLocation` — `workspace-root` or `prompt` for scaffold and install locations
- `harnessManager.multiHarnessInstall` — install without removing existing harnesses
- `harnessManager.cacheRefreshInterval` — cache lifetime in milliseconds


## What is a harness?

A harness is a collection of files (prompts, rules, hooks, skills) that tells your AI agent how to behave in a project. Installing one writes configuration files that are automatically picked up by:

| Tool | File(s) written |
|---|---|
| **AGENTS.md** (cross-tool standard) | `AGENTS.md` |
| **Claude Code** | `.claude/CLAUDE.md` · `.claude/active-harness.md` |
| **GitHub Copilot** | `.github/copilot-instructions.md` |
| **Cursor** | `.cursorrules` · `.cursor/rules/harness.mdc` |
| **Windsurf** | `.windsurfrules` · `.windsurf/rules/harness.md` |
| **Cline** | `.clinerules` |
| **Roo Code** | `.roo/rules/harness.md` |
| **Gemini CLI** | `GEMINI.md` |
| **Aider** | `CONVENTIONS.md` |
| **JetBrains Junie** | `.junie/guidelines.md` |

> [`AGENTS.md`](https://agents.md/) is the open, cross-tool standard read natively by most modern coding agents. Use the `harnessManager.pointerTargets` setting to pick exactly which tools receive files — leave it empty to write for all of them.

## Compatible editors

- **VS Code** — install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=AdmiralGallade.harness-manager)
- **Cursor, Windsurf, VSCodium & other VS Code forks** — install from [Open VSX](https://open-vsx.org/extension/AdmiralGallade/harness-manager), or side-load the `.vsix`

Also available on the [Open VSX Registry](https://open-vsx.org/extension/AdmiralGallade/harness-manager).

---

## Features

- **Browse harnesses** from a GitHub repository, grouped by category
- **Install with one click** — files are copied into `agent-harnesses/` with full directory structure preserved
- **Star harnesses** to pin them above the list for quick access
- **Focus mode** — collapse everything except your starred harnesses
- **Active section** — all installed harnesses are pinned at the top
- **Multi-harness support** — optionally keep several harnesses installed side by side
- **Import** a harness from a local folder or ZIP file
- **Multi-tool output** — write instruction files for up to 10 tools, including the `AGENTS.md` cross-tool standard; pick which ones via settings
- **Sync** — regenerate all AI instruction files from the active harness (fixes drift or applies a changed tool selection)
- **Reset** — clear all AI instruction files back to a placeholder and deactivate the current harness
- **Status bar** — the active harness is shown in the status bar; click it to open the sidebar
- **Version history** — every install or switch creates an automatic backup; restore any previous state with one click
- **Remove** any installed harness (backup is saved first)
- **Search** the full list, or only your starred harnesses in focus mode
- **Use your own repository** — point the extension at any public GitHub repo that follows the harness format

---

## Getting Started

1. Install the extension from the VS Code Marketplace
2. Open a folder in VS Code
3. Click the **Harness Manager** icon in the activity bar
4. Click **Install** on any harness
5. The harness is copied into `agent-harnesses/` and your AI config files are updated immediately

---

## Sidebar Layout

```
✓ Active Harnesses     ← all currently installed harnesses
★ Starred              ← your favourites (not yet installed)
  Available Harnesses  ← everything else, grouped by category
  Import Harness       ← import from a local folder or ZIP
  Harness Repository   ← switch to a different GitHub repo
  Version History      ← backups with restore and clear-all
```

---

## Settings

| Setting | Default | Description |
|---|---|---|
| `harnessManager.githubRepo` | `AdmiralGallade/harness-repository` | GitHub repo to load harnesses from (`owner/repo`) |
| `harnessManager.pointerTargets` | *(all 10 tools)* | Which AI tools to generate instruction files for; leave empty for all |
| `harnessManager.multiHarnessInstall` | `false` | When on, installing a harness does not remove others |
| `harnessManager.activeHarnessId` | *(auto)* | ID of the primary active harness (set automatically) |
| `harnessManager.cacheRefreshInterval` | `86400000` | Cache lifetime in ms (default 24 h) |

## Commands

| Command | Description |
|---|---|
| `Harness Manager: Sync AI Instruction Files from Active Harness` | Regenerate instruction files for the active harness |
| `Harness Manager: Reset AI Instruction Files (Clear Active Harness)` | Reset instruction files to a placeholder and clear the active harness |
| `Harness Manager: Switch Harness Repository` | Point the extension at a different GitHub repo |
| `Harness Manager: Create Harness Scaffold` | Generate a starter harness for publishing |
| `Harness Manager: Refresh Harness List` | Re-fetch the harness catalog |

---

## Harness Repository Format

Point the extension at any public GitHub repo with this structure:

```
harness-repository/
├── harnesses.json          # manifest listing all harnesses
└── harnesses/
    └── my-harness/
        ├── config.json
        ├── template.yaml
        └── README.md
```

**`harnesses.json` schema:**

```json
{
  "version": "1.0",
  "lastUpdated": "2026-01-01T00:00:00Z",
  "harnesses": [
    {
      "id": "my-harness",
      "name": "My Harness",
      "description": "What this harness does",
      "category": "Development",
      "tags": ["typescript", "testing"],
      "dependencies": [],
      "author": "Your Name",
      "version": "1.0.0",
      "files": [
        {
          "path": "harnesses/my-harness/template.yaml",
          "type": "template",
          "description": "Main instructions"
        }
      ]
    }
  ]
}
```

---

## License

MIT
