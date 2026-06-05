# Harness Manager

A VS Code extension for installing and managing **AI agent harnesses** — pre-built instruction sets that configure Claude Code, GitHub Copilot, and Cursor for specific workflows.

---

## What is a harness?

A harness is a collection of files (prompts, rules, hooks, skills) that tells your AI agent how to behave in a project. Installing one writes configuration files that are automatically picked up by:

- **Claude Code** — `.claude/CLAUDE.md`
- **GitHub Copilot** — `.github/copilot-instructions.md`
- **Cursor** — `.cursorrules` and `.cursor/rules/harness.mdc`

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
