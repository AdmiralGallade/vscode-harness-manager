# Harness Manager VS Code Extension

Simple, authentication-free VS Code extension for managing harnesses and bootstrapping projects.

## Features

- **No Authentication Required**: Browse and select harnesses without GitHub login
- **Quick Selection UI**: Use Quick Pick for fast harness discovery
- **Rich Preview**: View detailed harness information in a Webview panel
- **Tree Explorer**: Browse harnesses organized by category
- **Smart Caching**: Local caching with configurable refresh intervals
- **Automatic File Creation**: Create harness templates directly in your workspace

## Installation

1. Clone this repository
2. Run `npm install`
3. Press F5 to launch the extension in debug mode

## Configuration

Configure the extension in VS Code Settings (`Ctrl+,` or `Cmd+,`):

### `harnessManager.githubRepo`
- **Type**: `string`
- **Default**: `AdmiralGallade/harness-repository`
- **Description**: GitHub repository containing harness definitions (format: `owner/repo`)

### `harnessManager.cacheRefreshInterval`
- **Type**: `number`
- **Default**: `86400000` (24 hours)
- **Description**: Cache refresh interval in milliseconds

### `harnessManager.defaultCreateLocation`
- **Type**: `string`
- **Options**: `workspace-root` | `prompt`
- **Default**: `workspace-root`
- **Description**: Where to create harness files by default

## Commands

### `harness-manager.selectHarness`
Select and create a harness in your workspace.
- Opens Quick Pick for harness selection
- Fetches harness files from GitHub
- Creates files in the workspace
- Opens the first file in editor

### `harness-manager.refreshList`
Manually refresh the cached harnesses list from GitHub.

### `harness-manager.openSettings`
Open Harness Manager settings.

### `harness-manager.viewHarnessDetails`
View detailed information about a harness in a Webview panel.

## Architecture

### Core Services

**GitHubService**
- Fetches harness definitions from GitHub
- Handles GitHub API requests
- No authentication required (works with public repos)

**CacheManager**
- Caches harness data locally
- Manages cache expiration
- Allows manual cache refresh

**FileSystemManager**
- Creates files in workspace
- Handles file I/O operations
- Manages directory creation

**MetadataParser**
- Parses harness metadata
- Filters and searches harnesses
- Builds dependency trees
- Converts between JSON and YAML

### UI Components

**QuickPickUI**
- Fast command-palette style selection
- Search and filter support
- Tag and category selection

**WebviewPanel**
- Rich HTML5 UI for harness details
- Displays metadata, dependencies, and files
- VS Code theme integration

**TreeViewProvider**
- Sidebar explorer view
- Organize harnesses by category
- Quick navigation

## Development

### Build

```bash
npm run compile    # Compile TypeScript
npm run esbuild    # Bundle with esbuild
npm run watch      # Watch mode
```

### Testing

```bash
npm run lint       # Run ESLint
npm run test       # Run tests
```

### Debug

1. Press F5 in VS Code
2. A new VS Code window opens with the extension loaded
3. Use the Harness Manager commands

## Project Structure

```
src/
├── commands/           # Command handlers
│   ├── selectHarness.ts
│   └── refreshHarnesses.ts
├── services/           # Core business logic
│   ├── GitHubService.ts
│   ├── CacheManager.ts
│   ├── FileSystemManager.ts
│   └── MetadataParser.ts
├── ui/                 # UI components
│   ├── QuickPickUI.ts
│   ├── WebviewPanel.ts
│   └── TreeViewProvider.ts
├── types/              # TypeScript types
│   └── harness.ts
├── webview/            # Webview assets (HTML/CSS)
│   ├── index.html
│   ├── style.css
│   └── script.js
└── extension.ts        # Entry point
```

## GitHub Repository Structure

The harness repository should follow this structure:

```
harness-repository/
├── README.md
├── harnesses.json          # Central manifest
├── /harnesses/
│   ├── harness-name-1/
│   │   ├── config.json
│   │   ├── template.yaml
│   │   └── README.md
│   └── harness-name-2/
└── /skills/
    ├── skill-1/
    └── skill-2/
```

### harnesses.json Format

```json
{
  "version": "1.0",
  "lastUpdated": "2026-05-28T00:00:00Z",
  "harnesses": [
    {
      "id": "unique-id",
      "name": "Display Name",
      "description": "Detailed description",
      "category": "category-name",
      "tags": ["tag1", "tag2"],
      "dependencies": [],
      "author": "Author Name",
      "version": "1.0.0",
      "files": [
        {
          "path": "harnesses/harness-name/template.yaml",
          "type": "template",
          "description": "Template file"
        }
      ]
    }
  ]
}
```

## Dependencies

- `vscode`: VS Code extension API
- `octokit`: GitHub API client
- `js-yaml`: YAML parser
- `esbuild`: JavaScript bundler
- `typescript`: TypeScript compiler

## License

MIT

## Support

For issues or feature requests, please create an issue in the repository.

## Future Enhancements

- [ ] Local harness repository support
- [ ] Custom validation scripts
- [ ] Harness marketplace integration
- [ ] Version management
- [ ] Dependency resolution
- [ ] CI/CD integration
- [ ] Multi-language support
