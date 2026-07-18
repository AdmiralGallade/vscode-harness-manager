# Harness Manager

A lightweight VS Code, Cursor and Windsurf extension for installing and managing AI agent harnesses.

## Why use this

- Install harnesses from a GitHub repository
- Keep multiple harnesses available with optional multi-install support
- Automatically update AI agent config files for VS Code, Cursor, Copilot, and Windsurf
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
- `harnessManager.defaultCreateLocation` — `workspace-root` or `prompt` for scaffold and install locations
- `harnessManager.multiHarnessInstall` — install without removing existing harnesses
- `harnessManager.cacheRefreshInterval` — cache lifetime in milliseconds


## What is a harness?

A harness is a collection of files (prompts, rules, hooks, skills) that tells your AI agent how to behave in a project. Installing one writes configuration files that are automatically picked up by:

| Tool | File written |
|---|---|
| **Claude Code** | `.claude/CLAUDE.md` |
| **GitHub Copilot** | `.github/copilot-instructions.md` |
| **Cursor** | `.cursorrules` · `.cursor/rules/harness.mdc` |
| **Windsurf** | `.windsurfrules` · `.windsurf/rules/harness.md` |

## Compatible editors

- **VS Code** — install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=AdmiralGallade.harness-manager)
- **Cursor** — install directly via `.vsix`
- **Windsurf** — install directly via `.vsix`

---

## Features

- **Browse harnesses** from a GitHub repository, grouped by category
- **Install with one click** — files are copied into `agent-harnesses/` with full directory structure preserved
- **Star harnesses** to pin them above the list for quick access
- **Focus mode** — collapse everything except your starred harnesses
- **Active section** — all installed harnesses are pinned at the top
- **Multi-harness support** — optionally keep several harnesses installed side by side
- **Import** a harness from a local folder or ZIP file
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
| `harnessManager.multiHarnessInstall` | `false` | When on, installing a harness does not remove others |
| `harnessManager.activeHarnessId` | *(auto)* | ID of the primary active harness (set automatically) |
| `harnessManager.cacheRefreshInterval` | `86400000` | Cache lifetime in ms (default 24 h) |

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
