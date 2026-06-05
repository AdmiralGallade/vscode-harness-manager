import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { HarnessDefinition } from '../types/harness';
import { GitHubService } from '../services/GitHubService';
import { FileSystemManager } from '../services/FileSystemManager';
import { BackupManager } from '../services/BackupManager';

export class HarnessSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'harness-manager.harnessExplorer';

  private _view?: vscode.WebviewView;
  private _harnesses: HarnessDefinition[] = [];
  private _activeHarnessId?: string;
  private readonly _backup: BackupManager;

  constructor(
    private readonly _context: vscode.ExtensionContext,
    private readonly githubService: GitHubService,
    private readonly fileSystemManager: FileSystemManager
  ) {
    this._backup = new BackupManager(_context);
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this._getHtml();

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.type) {
        case 'ready':
          await this._loadAndSend();
          this._sendHistory();
          break;
        case 'install':
          await this._install(msg.id);
          break;
        case 'openFile':
          await this._openHarnessFile(msg.harnessId, msg.filePath);
          break;
        case 'openGitHub':
          vscode.env.openExternal(vscode.Uri.parse(msg.url));
          break;
        case 'createHarness':
          await this._createLocalHarness(msg.name, msg.description, msg.category);
          break;
        case 'addFromGithub':
          await this._addFromGithub(msg.url);
          break;
        case 'refresh':
          await this._loadAndSend(true);
          break;
        case 'restoreBackup':
          await this._restoreBackup(msg.harnessId, msg.timestamp);
          break;
        case 'clearBackups':
          await this._clearBackups();
          break;
      }
    });
  }

  refresh(): void {
    this._loadAndSend(true);
    this._sendHistory();
  }

  private async _loadAndSend(force = false): Promise<void> {
    this._send({ type: 'loading' });
    try {
      const list = await this.githubService.getHarnesesList(force);
      if (list && list.harnesses) {
        this._harnesses = list.harnesses;
        const activeId = vscode.workspace.getConfiguration('harnessManager').get<string>('activeHarnessId');
        this._activeHarnessId = activeId;
        this._send({ type: 'harnesses', harnesses: this._harnesses, activeId });
      } else {
        this._send({ type: 'error', message: 'Could not load harnesses from GitHub.' });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this._send({ type: 'error', message: msg });
    }
  }

  private async _install(id: string): Promise<void> {
    const harness = this._harnesses.find(h => h.id === id);
    if (!harness) {
      vscode.window.showErrorMessage(`Harness "${id}" not found`);
      return;
    }

    // Require an open workspace — offer to open one if none is loaded
    let wsRoot = this.fileSystemManager.getWorkspaceRoot();
    if (!wsRoot) {
      const choice = await vscode.window.showWarningMessage(
        'No folder is open. Harness Manager needs a workspace folder to install into.',
        { modal: true },
        'Open Folder…'
      );
      if (choice !== 'Open Folder…') {
        this._send({ type: 'installed', id, success: false });
        return;
      }
      await vscode.commands.executeCommand('vscode.openFolder');
      // After the user picks a folder VS Code reloads — nothing more to do here.
      this._send({ type: 'installed', id, success: false });
      return;
    }

    // Resolve the agent-harnesses base directory, prompting if it already exists
    const defaultBase = path.join(wsRoot, 'agent-harnesses');
    let baseDir: string | undefined = defaultBase;

    if (fs.existsSync(defaultBase)) {
      const choice = await vscode.window.showQuickPick(
        [
          {
            label: '$(folder-opened) Use existing folder',
            description: 'agent-harnesses',
            detail: `Install into the existing folder at ${defaultBase}`,
            value: 'existing',
          },
          {
            label: '$(new-folder) Create a new folder',
            description: 'Choose a different name',
            detail: 'You will be prompted for a folder name',
            value: 'new',
          },
        ],
        {
          title: '"agent-harnesses" already exists',
          placeHolder: 'Where should this harness be installed?',
        }
      );
      if (!choice) {
        this._send({ type: 'installed', id, success: false });
        return;
      }
      if ((choice as any).value === 'new') {
        const name = await vscode.window.showInputBox({
          title: 'New harness folder name',
          prompt: 'Enter a folder name (will be created inside the workspace root)',
          value: 'agent-harnesses-2',
          validateInput: v => (v.trim() ? null : 'Name cannot be empty'),
        });
        if (!name) {
          this._send({ type: 'installed', id, success: false });
          return;
        }
        baseDir = path.join(wsRoot, name.trim());
      }
    }

    this._send({ type: 'installing', id });

    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Window, title: `Installing ${harness.name}…` },
      async () => {
        // Download all harness files
        const files = new Map<string, string>();
        for (const file of harness.files) {
          const content = await this.githubService.getFileContent(file.path);
          if (content) { files.set(file.path, content); }
        }

        // Install into agent-harnesses/<harness-id>/
        const harnessDir = path.join(baseDir!, id);
        if (fs.existsSync(harnessDir)) {
          // Back up existing files before overwriting
          await this._backup.backup(id, harness.name, harnessDir);
          await this.fileSystemManager.removeHarness(harnessDir);
        }
        fs.mkdirSync(harnessDir, { recursive: true });

        const createdFiles: string[] = [];
        for (const [filePath, content] of files) {
          const dest = path.join(harnessDir, path.basename(filePath));
          fs.writeFileSync(dest, content, 'utf8');
          createdFiles.push(dest);
        }

        // Write AI tool pointer files in workspace root
        await this._writePointerFiles(wsRoot, harness, files, harnessDir, createdFiles);

        await vscode.workspace.getConfiguration('harnessManager').update('activeHarnessId', id, vscode.ConfigurationTarget.Global);
        this._activeHarnessId = id;

        vscode.window.showInformationMessage(
          `Installed '${harness.name}' into agent-harnesses/${id} and updated AI tool configs.`
        );
        this._send({ type: 'installed', id, success: true, activeId: id });
        this._sendHistory();

        if (createdFiles.length > 0) {
          await this.fileSystemManager.openFile(createdFiles[0]);
        }
      }
    );
  }

  private async _openHarnessFile(harnessId: string, filePath: string): Promise<void> {
    try {
      const content = await this.githubService.getFileContent(filePath);
      if (!content) {
        vscode.window.showErrorMessage(`Could not fetch file: ${filePath}`);
        return;
      }
      const ext = path.extname(filePath).slice(1) || 'txt';
      const langMap: Record<string, string> = {
        yaml: 'yaml', yml: 'yaml', json: 'json', md: 'markdown',
        ts: 'typescript', js: 'javascript', py: 'python', sh: 'shellscript',
      };
      const lang = langMap[ext] ?? 'plaintext';
      const doc = await vscode.workspace.openTextDocument({ content, language: lang });
      await vscode.window.showTextDocument(doc, { preview: true, preserveFocus: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      vscode.window.showErrorMessage(`Failed to open file: ${msg}`);
    }
  }

  private async _writePointerFiles(
    wsRoot: string,
    harness: HarnessDefinition,
    downloadedFiles: Map<string, string>,
    harnessDir: string,
    createdFiles: string[]
  ): Promise<void> {
    try {
      // Pull the richest content available: template > README > description fallback
      const templateEntry = [...downloadedFiles.entries()].find(([p]) => p.endsWith('.yaml') || p.endsWith('.yml'));
      const readmeEntry  = [...downloadedFiles.entries()].find(([p]) => p.toLowerCase().endsWith('.md'));
      const harnessInstructions = (templateEntry ?? readmeEntry)?.[1] ?? harness.description;

      const relDir = path.relative(wsRoot, harnessDir).replace(/\\/g, '/');

      const header = [
        `# ${harness.name}`,
        ``,
        `> **Harness Manager** — active harness: \`${harness.id}\`  `,
        `> Category: ${harness.category} · Version: ${harness.version} · Author: ${harness.author}`,
        `> Tags: ${harness.tags.join(', ')}`,
        ``,
        `## Description`,
        ``,
        harness.description,
        ``,
        `## Harness Location`,
        ``,
        `Files are installed at \`./${relDir}/\`:`,
        createdFiles.map(f => `- \`${path.relative(wsRoot, f).replace(/\\/g, '/')}\``).join('\n'),
        ``,
        `## Instructions`,
        ``,
      ].join('\n');

      const fullContent = header + harnessInstructions;

      // ── Claude Code: .claude/CLAUDE.md ──────────────────────────────────
      const claudeDir = path.join(wsRoot, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });
      fs.writeFileSync(path.join(claudeDir, 'CLAUDE.md'), fullContent, 'utf8');
      // legacy pointer used by /call-harness skill
      fs.writeFileSync(path.join(claudeDir, 'active-harness.md'), fullContent, 'utf8');

      // ── GitHub Copilot: .github/copilot-instructions.md ─────────────────
      const githubDir = path.join(wsRoot, '.github');
      fs.mkdirSync(githubDir, { recursive: true });
      fs.writeFileSync(path.join(githubDir, 'copilot-instructions.md'), fullContent, 'utf8');

      // ── Cursor: .cursorrules (legacy) + .cursor/rules/harness.mdc ───────
      fs.writeFileSync(path.join(wsRoot, '.cursorrules'), fullContent, 'utf8');

      const cursorRulesDir = path.join(wsRoot, '.cursor', 'rules');
      fs.mkdirSync(cursorRulesDir, { recursive: true });
      // .mdc format: frontmatter + content
      const mdcContent = `---\ndescription: Active harness — ${harness.name}\nalwaysApply: true\n---\n\n${fullContent}`;
      fs.writeFileSync(path.join(cursorRulesDir, 'harness.mdc'), mdcContent, 'utf8');

    } catch (e) {
      console.error('Failed to write AI tool pointer files:', e);
      vscode.window.showWarningMessage(`Harness installed but could not write AI config files: ${e instanceof Error ? e.message : e}`);
    }
  }

  private async _createLocalHarness(name: string, description: string, category: string): Promise<void> {
    const wsRoot = this.fileSystemManager.getWorkspaceRoot() ?? (await this.fileSystemManager.getTargetDirectory(false));
    if (!wsRoot) { return; }

    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const harnessDir = path.join(wsRoot, 'agent-harnesses', id);
    if (!fs.existsSync(harnessDir)) { fs.mkdirSync(harnessDir, { recursive: true }); }

    const configJson = JSON.stringify({ id, name, description, category: category || 'Custom', tags: [], dependencies: [], author: 'Local', version: '1.0.0' }, null, 2);
    const templateYaml = `name: ${id}\ndescription: ${description}\n\ninstructions: |\n  <!-- Add your harness instructions here -->\n`;
    const readmeMd = `# ${name}\n\n${description}\n\n## Instructions\n\n<!-- Add your harness instructions here -->\n`;

    fs.writeFileSync(path.join(harnessDir, 'config.json'), configJson, 'utf8');
    fs.writeFileSync(path.join(harnessDir, 'template.yaml'), templateYaml, 'utf8');
    fs.writeFileSync(path.join(harnessDir, 'README.md'), readmeMd, 'utf8');

    // Write AI tool pointer files so the new harness is immediately usable
    const fakeHarness = { id, name, description, category: category || 'Custom', tags: [], dependencies: [], author: 'Local', version: '1.0.0', files: [] };
    const downloadedFiles = new Map<string, string>([[`${id}/template.yaml`, templateYaml], [`${id}/README.md`, readmeMd]]);
    await this._writePointerFiles(wsRoot, fakeHarness as any, downloadedFiles, harnessDir, [
      path.join(harnessDir, 'config.json'),
      path.join(harnessDir, 'template.yaml'),
      path.join(harnessDir, 'README.md'),
    ]);

    vscode.window.showInformationMessage(`Created harness '${name}' in agent-harnesses/${id} — AI config files updated.`);
    await this.fileSystemManager.openFile(path.join(harnessDir, 'README.md'));
  }

  private async _addFromGithub(url: string): Promise<void> {
    const match = url.match(/github\.com\/([^/]+)\/([^/?#]+)/);
    if (!match) {
      vscode.window.showErrorMessage('Invalid GitHub URL. Expected: https://github.com/owner/repo');
      return;
    }
    const [, owner, repo] = match;
    await vscode.workspace.getConfiguration('harnessManager').update('githubRepo', `${owner}/${repo}`, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(`Switched harness repository to ${owner}/${repo}`);
    await this._loadAndSend(true);
  }

  private _sendHistory(): void {
    const entries = this._backup.getBackups();
    const sizeKb  = Math.round(this._backup.totalSize() / 1024);
    this._send({ type: 'history', entries, sizeKb });
  }

  private async _restoreBackup(harnessId: string, timestamp: number): Promise<void> {
    const ok = await this._backup.restore(harnessId, timestamp);
    if (ok) {
      vscode.window.showInformationMessage(`Restored harness '${harnessId}' to backup from ${new Date(timestamp).toLocaleString()}`);
      this._sendHistory();
    } else {
      vscode.window.showErrorMessage(`Could not restore backup — files may have been deleted.`);
    }
  }

  private async _clearBackups(): Promise<void> {
    const confirm = await vscode.window.showWarningMessage(
      'Delete all harness backups? This cannot be undone.',
      { modal: true },
      'Delete All'
    );
    if (confirm !== 'Delete All') { return; }
    this._backup.clearAll();
    vscode.window.showInformationMessage('All harness backups deleted.');
    this._sendHistory();
  }

  private _send(data: object): void {
    this._view?.webview.postMessage(data);
  }

  private _getHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:var(--vscode-font-family);font-size:var(--vscode-font-size);color:var(--vscode-foreground);background:var(--vscode-sideBar-background)}

  /* ── toolbar ── */
  .toolbar{display:flex;gap:4px;padding:6px 8px;border-bottom:1px solid var(--vscode-sideBarSectionHeader-border)}
  .toolbar input{flex:1;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border);border-radius:2px;padding:3px 6px;font-size:12px;outline:none}
  .toolbar input::placeholder{color:var(--vscode-input-placeholderForeground)}
  .toolbar button{background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:none;border-radius:2px;padding:3px 8px;cursor:pointer;font-size:13px}
  .toolbar button:hover{background:var(--vscode-button-hoverBackground)}

  /* ── collapsible sections ── */
  .section{border-bottom:1px solid var(--vscode-sideBarSectionHeader-border)}
  .section-header{display:flex;align-items:center;gap:5px;padding:5px 8px;background:var(--vscode-sideBarSectionHeader-background);cursor:pointer;user-select:none;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--vscode-sideBarSectionHeader-foreground)}
  .section-header .arrow{font-size:9px;transition:transform .15s;display:inline-block;width:10px;text-align:center}
  .section-header.collapsed .arrow{transform:rotate(-90deg)}
  .section-body.hidden{display:none}

  /* ── harness row ── */
  .category-label{padding:5px 8px 2px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--vscode-descriptionForeground);font-weight:600}
  .harness-row{display:flex;align-items:center;padding:5px 8px 5px 16px;cursor:pointer;border-left:2px solid transparent;user-select:none}
  .harness-row:hover{background:var(--vscode-list-hoverBackground)}
  .harness-row.active{border-left-color:var(--vscode-charts-green)}
  .harness-row.selected{background:var(--vscode-list-activeSelectionBackground);color:var(--vscode-list-activeSelectionForeground)}
  .harness-row.selected .harness-meta{color:var(--vscode-list-activeSelectionForeground);opacity:.8}
  .row-arrow{font-size:9px;color:var(--vscode-descriptionForeground);margin-right:5px;transition:transform .15s;flex-shrink:0}
  .row-arrow.open{transform:rotate(90deg)}
  .harness-info{flex:1;min-width:0}
  .harness-name{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .harness-meta{font-size:11px;color:var(--vscode-descriptionForeground);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}
  .install-btn{background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:none;border-radius:2px;padding:2px 8px;cursor:pointer;font-size:11px;white-space:nowrap;flex-shrink:0;margin-left:6px}
  .install-btn:hover{background:var(--vscode-button-hoverBackground)}
  .install-btn:disabled{opacity:.55;cursor:not-allowed}
  .install-btn.active-btn{background:var(--vscode-charts-green);color:#fff}

  /* ── detail drawer ── */
  .harness-detail{display:none;padding:8px 12px 10px 24px;background:var(--vscode-editor-background);border-left:2px solid var(--vscode-focusBorder);margin-left:0}
  .harness-detail.open{display:block}
  .detail-desc{font-size:12px;line-height:1.5;color:var(--vscode-foreground);margin-bottom:8px;white-space:pre-wrap}
  .detail-meta-grid{display:grid;grid-template-columns:auto 1fr;gap:2px 8px;font-size:11px;margin-bottom:8px}
  .detail-meta-key{color:var(--vscode-descriptionForeground);font-weight:600}
  .detail-meta-val{color:var(--vscode-foreground)}
  .detail-tags{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:8px}
  .tag{background:var(--vscode-badge-background);color:var(--vscode-badge-foreground);border-radius:2px;padding:1px 5px;font-size:10px}
  .detail-section-label{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--vscode-descriptionForeground);font-weight:600;margin-bottom:4px}
  .file-list{list-style:none}
  .file-item{display:flex;align-items:baseline;gap:6px;padding:2px 0;cursor:pointer}
  .file-item:hover .file-name{text-decoration:underline;color:var(--vscode-textLink-activeForeground)}
  .file-icon{font-size:11px;flex-shrink:0;color:var(--vscode-descriptionForeground)}
  .file-name{font-size:12px;color:var(--vscode-textLink-foreground);font-family:var(--vscode-editor-font-family,monospace)}
  .file-type{font-size:10px;color:var(--vscode-descriptionForeground)}
  .file-desc{font-size:11px;color:var(--vscode-descriptionForeground);margin-left:17px;margin-bottom:2px}
  .detail-install-row{margin-top:8px}
  .detail-install-row button{background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:none;border-radius:2px;padding:4px 12px;cursor:pointer;font-size:12px}
  .detail-install-row button:hover{background:var(--vscode-button-hoverBackground)}
  .detail-install-row button.active-btn{background:var(--vscode-charts-green);color:#fff}

  /* ── forms ── */
  .form-body{padding:8px}
  .form-body label{display:block;font-size:11px;margin-bottom:2px;color:var(--vscode-descriptionForeground)}
  .form-body input,.form-body textarea{width:100%;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border);border-radius:2px;padding:4px 6px;font-size:12px;margin-bottom:6px;font-family:inherit;outline:none}
  .form-body input::placeholder,.form-body textarea::placeholder{color:var(--vscode-input-placeholderForeground)}
  .form-body textarea{resize:vertical;min-height:52px}
  .form-body .btn-row{display:flex;gap:4px}
  .form-body button{flex:1;background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:none;border-radius:2px;padding:5px;cursor:pointer;font-size:12px}
  .form-body button:hover{background:var(--vscode-button-hoverBackground)}
  .form-body button.secondary{background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground)}
  .form-body button.secondary:hover{background:var(--vscode-button-secondaryHoverBackground)}

  /* ── version history ── */
  .history-meta{display:flex;align-items:center;justify-content:space-between;padding:6px 8px;font-size:11px;color:var(--vscode-descriptionForeground);border-bottom:1px solid var(--vscode-sideBarSectionHeader-border)}
  .clear-btn{background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground);border:none;border-radius:2px;padding:2px 7px;cursor:pointer;font-size:11px}
  .clear-btn:hover{background:var(--vscode-button-secondaryHoverBackground)}
  .history-harness-label{padding:5px 8px 2px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--vscode-descriptionForeground);font-weight:600}
  .history-entry{display:flex;align-items:center;padding:4px 8px 4px 16px;gap:6px}
  .history-entry:hover{background:var(--vscode-list-hoverBackground)}
  .history-entry-info{flex:1;min-width:0}
  .history-ts{display:block;font-size:12px;color:var(--vscode-foreground)}
  .history-files{display:block;font-size:10px;color:var(--vscode-descriptionForeground)}
  .restore-btn{background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:none;border-radius:2px;padding:2px 8px;cursor:pointer;font-size:11px;flex-shrink:0}
  .restore-btn:hover{background:var(--vscode-button-hoverBackground)}
  .restore-btn:disabled{opacity:.55;cursor:not-allowed}

  /* ── misc ── */
  .status{padding:20px 8px;text-align:center;color:var(--vscode-descriptionForeground);font-size:12px}
  .spinner{display:inline-block;width:14px;height:14px;border:2px solid var(--vscode-descriptionForeground);border-top-color:var(--vscode-focusBorder);border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle;margin-right:6px}
  @keyframes spin{to{transform:rotate(360deg)}}
  .empty{padding:14px 8px;color:var(--vscode-descriptionForeground);font-size:12px;text-align:center}
</style>
</head>
<body>

<div class="toolbar">
  <input id="search" type="text" placeholder="Search harnesses…" oninput="onSearch()"/>
  <button title="Refresh list" onclick="refresh()">↻</button>
</div>

<div class="section">
  <div class="section-header" onclick="toggleSection('list')">
    <span class="arrow">▾</span> Available Harnesses
  </div>
  <div class="section-body" id="listBody">
    <div class="status"><span class="spinner"></span>Loading…</div>
  </div>
</div>

<div class="section">
  <div class="section-header collapsed" onclick="toggleSection('create')">
    <span class="arrow">▾</span> Create Harness
  </div>
  <div class="section-body hidden" id="createBody">
    <div class="form-body">
      <label>Name</label>
      <input id="createName" type="text" placeholder="My Harness"/>
      <label>Description</label>
      <textarea id="createDesc" placeholder="What does this harness do?"></textarea>
      <label>Category</label>
      <input id="createCat" type="text" placeholder="Custom"/>
      <button onclick="createHarness()">Create Harness</button>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-header collapsed" onclick="toggleSection('github')">
    <span class="arrow">▾</span> Harness Repository
  </div>
  <div class="section-body hidden" id="githubBody">
    <div class="form-body">
      <label>GitHub Repository URL</label>
      <input id="githubUrl" type="text" placeholder="https://github.com/owner/repo"/>
      <div class="btn-row">
        <button onclick="addFromGithub()">Use This Repo</button>
        <button class="secondary" onclick="openGithub()">Browse →</button>
      </div>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-header collapsed" onclick="toggleSection('history')">
    <span class="arrow">▾</span> Version History
  </div>
  <div class="section-body hidden" id="historyBody">
    <div id="historyContent"><div class="empty">No backups yet.</div></div>
  </div>
</div>

<script>
  const vscode = acquireVsCodeApi();

  // State
  let allHarnesses = [];
  let activeId = null;
  let openDetailId = null;

  // Section collapse state keyed by id suffix
  const sectionState = { list: false, create: true, github: true, history: true };

  function toggleSection(key) {
    sectionState[key] = !sectionState[key];
    const bodyId = key === 'list' ? 'listBody' : key + 'Body';
    const body = document.getElementById(bodyId);
    const header = body.previousElementSibling;
    body.classList.toggle('hidden', sectionState[key]);
    header.classList.toggle('collapsed', sectionState[key]);
  }

  /* ── Search ── */
  function onSearch() {
    const q = document.getElementById('search').value.toLowerCase().trim();
    const filtered = q
      ? allHarnesses.filter(h =>
          h.name.toLowerCase().includes(q) ||
          h.description.toLowerCase().includes(q) ||
          (h.tags || []).some(t => t.toLowerCase().includes(q)) ||
          h.category.toLowerCase().includes(q)
        )
      : allHarnesses;
    renderHarnesses(filtered);
  }

  /* ── Render harness list (NO inline onclick — uses data attributes + delegation) ── */
  function renderHarnesses(harnesses) {
    const body = document.getElementById('listBody');
    if (!harnesses.length) {
      body.innerHTML = '<div class="empty">No harnesses found.</div>';
      return;
    }

    const byCategory = {};
    harnesses.forEach(h => { (byCategory[h.category] = byCategory[h.category] || []).push(h); });

    const parts = [];
    const FILE_ICONS = { config: '⚙', template: '📄', documentation: '📖' };

    for (const [cat, items] of Object.entries(byCategory)) {
      parts.push('<div class="category-label">' + esc(cat) + '</div>');

      for (const h of items) {
        const isActive = h.id === activeId;
        const isOpen   = h.id === openDetailId;

        // ── file list (data-filepath / data-hid on each item) ──
        let filesHtml = '';
        if (h.files && h.files.length) {
          filesHtml = '<div class="detail-section-label" style="margin-top:6px">Files</div><ul class="file-list">';
          for (const f of h.files) {
            const icon  = FILE_ICONS[f.type] || '📄';
            const fname = f.path.split('/').pop();
            filesHtml += '<li class="file-item" data-action="openfile" data-hid="' + esc(h.id) + '" data-filepath="' + esc(f.path) + '">'
              + '<span class="file-icon">' + icon + '</span>'
              + '<span class="file-name">'  + esc(fname)  + '</span>'
              + '<span class="file-type">'  + esc(f.type) + '</span>'
              + '</li>';
            if (f.description) {
              filesHtml += '<div class="file-desc">' + esc(f.description) + '</div>';
            }
          }
          filesHtml += '</ul>';
        }

        // ── tag pills ──
        const tagPills = (h.tags && h.tags.length)
          ? '<div class="detail-tags">' + h.tags.map(t => '<span class="tag">' + esc(t) + '</span>').join('') + '</div>'
          : '';

        // ── dependencies ──
        const depsHtml = (h.dependencies && h.dependencies.length)
          ? '<div class="detail-meta-key">Depends on</div><div class="detail-meta-val">' + esc(h.dependencies.join(', ')) + '</div>'
          : '';

        parts.push(
          // wrapper — carries the harness id
          '<div id="item-' + esc(h.id) + '" data-hid="' + esc(h.id) + '">'

          // ── clickable row ──
          + '<div class="harness-row' + (isActive ? ' active' : '') + (isOpen ? ' selected' : '') + '" data-action="toggle" data-hid="' + esc(h.id) + '">'
          +   '<span class="row-arrow' + (isOpen ? ' open' : '') + '">▶</span>'
          +   '<div class="harness-info">'
          +     '<div class="harness-name">' + esc(h.name) + (isActive ? ' <span style="color:var(--vscode-charts-green);font-size:11px">✓ active</span>' : '') + '</div>'
          +     '<div class="harness-meta">' + esc(h.description) + '</div>'
          +   '</div>'
          // install button on the row — data-action="install" stops propagation in the delegated handler
          +   '<button class="install-btn' + (isActive ? ' active-btn' : '') + '" data-action="install" data-hid="' + esc(h.id) + '">'
          +     (isActive ? 'Active' : 'Install')
          +   '</button>'
          + '</div>'

          // ── detail drawer ──
          + '<div class="harness-detail' + (isOpen ? ' open' : '') + '" id="detail-' + esc(h.id) + '">'
          +   '<div class="detail-desc">' + esc(h.description) + '</div>'
          +   '<div class="detail-meta-grid">'
          +     '<div class="detail-meta-key">Author</div><div class="detail-meta-val">'   + esc(h.author  || '—') + '</div>'
          +     '<div class="detail-meta-key">Version</div><div class="detail-meta-val">'  + esc(h.version || '—') + '</div>'
          +     '<div class="detail-meta-key">Category</div><div class="detail-meta-val">' + esc(h.category)       + '</div>'
          +     depsHtml
          +   '</div>'
          +   tagPills
          +   filesHtml
          +   '<div class="detail-install-row">'
          +     '<button class="' + (isActive ? 'active-btn' : '') + '" data-action="install" data-hid="' + esc(h.id) + '">'
          +       (isActive ? '✓ Installed & Active' : 'Install Harness')
          +     '</button>'
          +   '</div>'
          + '</div>'
          + '</div>'
        );
      }
    }
    body.innerHTML = parts.join('');
  }

  /* ── Delegated click handler on the list container ── */
  document.getElementById('listBody').addEventListener('click', function(e) {
    const target = e.target;

    // Walk up to find the element with data-action
    const actionEl = target.closest('[data-action]');
    if (!actionEl) return;

    const action = actionEl.dataset.action;
    const id     = actionEl.dataset.hid;

    if (action === 'install') {
      e.stopPropagation();
      // Disable both buttons for this harness
      document.querySelectorAll('[data-action="install"][data-hid="' + id + '"]').forEach(b => {
        b.textContent = '…';
        b.disabled = true;
      });
      vscode.postMessage({ type: 'install', id });

    } else if (action === 'toggle') {
      const prevId = openDetailId;

      // Close previously open drawer
      if (prevId && prevId !== id) {
        const prev = document.getElementById('item-' + prevId);
        if (prev) {
          prev.querySelector('.harness-row').classList.remove('selected');
          prev.querySelector('.row-arrow').classList.remove('open');
          prev.querySelector('.harness-detail').classList.remove('open');
        }
      }

      const item   = document.getElementById('item-' + id);
      const row    = item.querySelector('.harness-row');
      const arrow  = item.querySelector('.row-arrow');
      const detail = item.querySelector('.harness-detail');

      if (openDetailId === id) {
        row.classList.remove('selected'); arrow.classList.remove('open'); detail.classList.remove('open');
        openDetailId = null;
      } else {
        row.classList.add('selected'); arrow.classList.add('open'); detail.classList.add('open');
        openDetailId = id;
      }

    } else if (action === 'openfile') {
      const filePath = actionEl.dataset.filepath;
      vscode.postMessage({ type: 'openFile', harnessId: id, filePath });
    }
  });

  /* ── Escape helper (used in renderHarnesses — safe for both text content and attribute values) ── */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Refresh ── */
  function refresh() {
    openDetailId = null;
    document.getElementById('listBody').innerHTML = '<div class="status"><span class="spinner"></span>Loading…</div>';
    vscode.postMessage({ type: 'refresh' });
  }

  /* ── Create harness ── */
  function createHarness() {
    const name = document.getElementById('createName').value.trim();
    const description = document.getElementById('createDesc').value.trim();
    const category = document.getElementById('createCat').value.trim();
    if (!name) { alert('Name is required'); return; }
    vscode.postMessage({ type: 'createHarness', name, description, category });
    document.getElementById('createName').value = '';
    document.getElementById('createDesc').value = '';
    document.getElementById('createCat').value = '';
  }

  /* ── GitHub repo ── */
  function addFromGithub() {
    const url = document.getElementById('githubUrl').value.trim();
    if (!url) { alert('Enter a GitHub URL'); return; }
    vscode.postMessage({ type: 'addFromGithub', url });
  }

  function openGithub() {
    const url = document.getElementById('githubUrl').value.trim() || 'https://github.com/AdmiralGallade/harness-repository';
    vscode.postMessage({ type: 'openGitHub', url });
  }

  /* escHtml kept as alias so error-message display still works */
  function escHtml(s) { return esc(s); }

  /* ── Version History ── */
  function renderHistory(entries, sizeKb) {
    const el = document.getElementById('historyContent');
    if (!entries || !entries.length) {
      el.innerHTML = '<div class="empty">No backups yet. Backups are created automatically before each install.</div>';
      return;
    }

    // Group by harnessId
    const byId = {};
    entries.forEach(e => { (byId[e.harnessId] = byId[e.harnessId] || []).push(e); });

    let html = '<div class="history-meta">Storage used: ' + esc(sizeKb + ' KB')
      + ' &nbsp;<button class="clear-btn" data-action="clearBackups">Clear All</button></div>';

    for (const [hid, versions] of Object.entries(byId)) {
      const name = versions[0].harnessName || hid;
      html += '<div class="history-harness-label">' + esc(name) + '</div>';
      for (const v of versions) {
        html += '<div class="history-entry">'
          + '<div class="history-entry-info">'
          +   '<span class="history-ts">' + esc(v.label) + '</span>'
          +   '<span class="history-files">' + v.files.length + ' file' + (v.files.length !== 1 ? 's' : '') + '</span>'
          + '</div>'
          + '<button class="restore-btn" data-action="restore" data-hid="' + esc(v.harnessId) + '" data-ts="' + v.timestamp + '">'
          +   'Restore'
          + '</button>'
          + '</div>';
      }
    }
    el.innerHTML = html;
  }

  /* Delegated click handler for history buttons */
  document.getElementById('historyContent').addEventListener('click', function(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'clearBackups') {
      vscode.postMessage({ type: 'clearBackups' });
    } else if (btn.dataset.action === 'restore') {
      btn.textContent = 'Restoring…';
      btn.disabled = true;
      vscode.postMessage({ type: 'restoreBackup', harnessId: btn.dataset.hid, timestamp: Number(btn.dataset.ts) });
    }
  });

  /* ── Message handler ── */
  window.addEventListener('message', e => {
    const msg = e.data;
    switch (msg.type) {
      case 'loading':
        document.getElementById('listBody').innerHTML = '<div class="status"><span class="spinner"></span>Loading…</div>';
        break;
      case 'harnesses':
        allHarnesses = msg.harnesses || [];
        activeId = msg.activeId || null;
        onSearch();
        break;
      case 'error':
        document.getElementById('listBody').innerHTML =
          '<div class="status" style="color:var(--vscode-errorForeground)">' + escHtml(msg.message) + '</div>';
        break;
      case 'installed':
        if (msg.success) {
          activeId = msg.activeId;
          onSearch();
        } else {
          document.querySelectorAll('.install-btn:disabled, .detail-install-row button:disabled').forEach(b => {
            b.disabled = false;
            b.textContent = 'Install';
          });
        }
        break;
      case 'history':
        renderHistory(msg.entries, msg.sizeKb);
        // Re-enable any stuck restore buttons
        document.querySelectorAll('.restore-btn:disabled').forEach(b => {
          b.disabled = false;
          b.textContent = 'Restore';
        });
        break;
    }
  });

  vscode.postMessage({ type: 'ready' });
</script>
</body>
</html>`;
  }
}
