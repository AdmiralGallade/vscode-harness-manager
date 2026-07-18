import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { HarnessDefinition } from '../types/harness';
import { GitHubService } from '../services/GitHubService';
import { FileSystemManager } from '../services/FileSystemManager';
import { BackupManager } from '../services/BackupManager';
import { Logger } from '../services/Logger';

const SCOPE = 'SidebarProvider';

export class HarnessSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'harness-manager.harnessExplorer';

  private _view?: vscode.WebviewView;
  private _harnesses: HarnessDefinition[] = [];
  private _activeHarnessId?: string;
  private readonly _backup: BackupManager;

  private _getStarred(): string[] {
    const starred = this._context.globalState.get<string[]>('starredHarnesses', []);
    Logger.instance.debug(SCOPE, `_getStarred — ${starred.length} starred: [${starred.join(',')}]`);
    return starred;
  }

  private _toggleStar(id: string): void {
    const log = Logger.instance;
    const starred = this._context.globalState.get<string[]>('starredHarnesses', []);
    const wasStarred = starred.includes(id);
    const next = wasStarred ? starred.filter(s => s !== id) : [...starred, id];
    log.info(SCOPE, `_toggleStar("${id}") — ${wasStarred ? 'unstarring' : 'starring'} → [${next.join(',')}]`);
    this._context.globalState.update('starredHarnesses', next);
    const activeId    = this._activeHarnessId;
    const installedIds = this._getInstalledIds();
    log.debug(SCOPE, `_toggleStar — re-sending harness list (activeId="${activeId}", installed=[${installedIds.join(',')}])`);
    this._send({ type: 'harnesses', harnesses: this._harnesses, activeId, installedIds, starredIds: next });
  }

  private _getInstalledIds(): string[] {
    const log = Logger.instance;
    const wsRoot = this.fileSystemManager.getWorkspaceRoot();
    if (!wsRoot) {
      log.debug(SCOPE, '_getInstalledIds — no workspace root, returning []');
      return [];
    }
    const baseDir = path.join(wsRoot, 'agent-harnesses');
    if (!fs.existsSync(baseDir)) {
      log.debug(SCOPE, `_getInstalledIds — baseDir does not exist: ${baseDir}`);
      return [];
    }
    try {
      const ids = fs.readdirSync(baseDir).filter(e =>
        fs.statSync(path.join(baseDir, e)).isDirectory()
      );
      log.debug(SCOPE, `_getInstalledIds — found ${ids.length} dir(s): [${ids.join(',')}]`);
      return ids;
    } catch (e) {
      log.warn(SCOPE, `_getInstalledIds — readdir failed: ${e instanceof Error ? e.message : e}`);
      return [];
    }
  }

  constructor(
    private readonly _context: vscode.ExtensionContext,
    private readonly githubService: GitHubService,
    private readonly fileSystemManager: FileSystemManager
  ) {
    this._backup = new BackupManager(_context);
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    const log = Logger.instance;
    log.info(SCOPE, 'resolveWebviewView — webview mounted');
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this._getHtml();
    log.debug(SCOPE, 'Webview HTML set');

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      log.debug(SCOPE, `← webview msg: ${msg.type}`, msg.type !== 'ready' ? msg : undefined);
      switch (msg.type) {
        case 'ready':
          log.info(SCOPE, 'Webview ready — loading harnesses and history');
          await this._loadAndSend();
          this._sendHistory();
          break;
        case 'install':
          log.info(SCOPE, `Install requested: "${msg.id}"`);
          await this._install(msg.id);
          break;
        case 'openFile':
          log.info(SCOPE, `Open file: "${msg.filePath}" (harness "${msg.harnessId}")`);
          await this._openHarnessFile(msg.harnessId, msg.filePath);
          break;
        case 'openGitHub':
          log.info(SCOPE, `Open GitHub URL: ${msg.url}`);
          vscode.env.openExternal(vscode.Uri.parse(msg.url));
          break;
        case 'importHarness':
          log.info(SCOPE, `Import harness — source: ${msg.source}`);
          await this._importHarness(msg.source as 'folder' | 'zip');
          break;
        case 'addFromGithub':
          log.info(SCOPE, `Switch GitHub repo to URL: ${msg.url}`);
          await this._addFromGithub(msg.url);
          break;
        case 'refresh':
          log.info(SCOPE, 'Force refresh requested');
          await this._loadAndSend(true);
          break;
        case 'restoreBackup':
          log.info(SCOPE, `Restore backup: harnessId="${msg.harnessId}" ts=${msg.timestamp}`);
          await this._restoreBackup(msg.harnessId, msg.timestamp);
          break;
        case 'removeHarness':
          log.info(SCOPE, `Remove harness: "${msg.id}"`);
          await this._removeHarness(msg.id);
          break;
        case 'toggleStar':
          log.info(SCOPE, `Toggle star: "${msg.id}"`);
          this._toggleStar(msg.id);
          break;
        case 'clearBackups':
          log.info(SCOPE, 'Clear all backups requested');
          await this._clearBackups();
          break;
        default:
          log.warn(SCOPE, `Unknown webview message type: "${(msg as any).type}"`);
      }
    });
  }

  refresh(): void {
    this._loadAndSend(true);
    this._sendHistory();
  }

  private async _loadAndSend(force = false): Promise<void> {
    const log = Logger.instance;
    log.info(SCOPE, `_loadAndSend(force=${force})`);
    this._send({ type: 'loading' });
    try {
      const list = await this.githubService.getHarnesesList(force);
      if (list && list.harnesses) {
        this._harnesses = list.harnesses;
        const activeId = vscode.workspace.getConfiguration('harnessManager').get<string>('activeHarnessId');
        this._activeHarnessId = activeId;
        const installedIds = this._getInstalledIds();
        const starredIds   = this._getStarred();
        log.info(SCOPE, `Sending ${this._harnesses.length} harnesses to webview, activeId="${activeId}", installed=[${installedIds.join(',')}], starred=[${starredIds.join(',')}]`);
        this._send({ type: 'harnesses', harnesses: this._harnesses, activeId, installedIds, starredIds });
      } else {
        log.warn(SCOPE, 'getHarnesesList returned null/empty — sending error to webview');
        this._send({ type: 'error', message: 'Could not load harnesses from GitHub.' });
      }
    } catch (e) {
      log.error(SCOPE, '_loadAndSend caught unexpected error', e);
      const msg = e instanceof Error ? e.message : String(e);
      this._send({ type: 'error', message: msg });
    }
  }

  private async _install(id: string): Promise<void> {
    const log = Logger.instance;
    log.info(SCOPE, `_install("${id}") — start`);

    const harness = this._harnesses.find(h => h.id === id);
    if (!harness) {
      log.error(SCOPE, `_install("${id}") — harness not found in loaded list (${this._harnesses.map(h => h.id).join(', ')})`);
      vscode.window.showErrorMessage(`Harness "${id}" not found`);
      return;
    }
    log.debug(SCOPE, `Harness found: "${harness.name}" v${harness.version}, ${harness.files.length} files`);

    // Require an open workspace — offer to open one if none is loaded
    const wsRoot = this.fileSystemManager.getWorkspaceRoot();
    log.debug(SCOPE, `Workspace root: ${wsRoot ?? '(none)'}`);
    if (!wsRoot) {
      log.warn(SCOPE, 'No workspace folder open — prompting user');
      const choice = await vscode.window.showWarningMessage(
        'No folder is open. Harness Manager needs a workspace folder to install into.',
        { modal: true },
        'Open Folder…'
      );
      log.info(SCOPE, `User response to open-folder prompt: "${choice}"`);
      if (choice !== 'Open Folder…') {
        this._send({ type: 'installed', id, success: false });
        return;
      }
      await vscode.commands.executeCommand('vscode.openFolder');
      this._send({ type: 'installed', id, success: false });
      return;
    }

    // Base folder is always agent-harnesses/ — create silently if needed
    const baseDir = path.join(wsRoot, 'agent-harnesses');
    log.debug(SCOPE, `Base dir: ${baseDir}`);
    fs.mkdirSync(baseDir, { recursive: true });

    // Warn only if THIS specific harness is already installed
    const existingHarnessDir = path.join(baseDir, id);
    if (fs.existsSync(existingHarnessDir)) {
      log.info(SCOPE, `Harness already installed at ${existingHarnessDir} — prompting for confirmation`);
      const choice = await vscode.window.showWarningMessage(
        `'${harness.name}' is already installed. Reinstalling will replace it (a backup will be saved first).`,
        { modal: true },
        'Reinstall'
      );
      log.info(SCOPE, `User response to reinstall prompt: "${choice}"`);
      if (choice !== 'Reinstall') {
        this._send({ type: 'installed', id, success: false });
        return;
      }
    }

    // ── Multi-harness prompt (before progress spinner, needs user interaction) ──
    const cfg = vscode.workspace.getConfiguration('harnessManager');
    let multiMode = cfg.get<boolean>('multiHarnessInstall', false);

    if (!multiMode) {
      const otherDirs = fs.existsSync(baseDir)
        ? fs.readdirSync(baseDir).filter(e => e !== id && fs.statSync(path.join(baseDir, e)).isDirectory())
        : [];
      if (otherDirs.length > 0) {
        const otherNames = otherDirs
          .map(d => this._harnesses.find(h => h.id === d)?.name ?? d)
          .join(', ');
        const choice = await vscode.window.showWarningMessage(
          `'${otherNames}' ${otherDirs.length > 1 ? 'are' : 'is'} already installed. Install '${harness.name}' alongside or replace?`,
          { modal: true },
          'Install alongside',
          'Replace'
        );
        log.info(SCOPE, `Multi-harness prompt — user chose: "${choice}"`);
        if (!choice) {
          this._send({ type: 'installed', id, success: false });
          return;
        }
        if (choice === 'Install alongside') {
          multiMode = true;
          await cfg.update('multiHarnessInstall', true, vscode.ConfigurationTarget.Global);
          vscode.window.showInformationMessage(
            `Multi-harness mode enabled. You can change this in Settings (harnessManager.multiHarnessInstall).`
          );
        } else {
          vscode.window.showInformationMessage(
            `Harness replaced. You can enable multi-harness installs in Settings (harnessManager.multiHarnessInstall).`
          );
        }
      }
    }

    this._send({ type: 'installing', id });
    log.info(SCOPE, `Starting download of ${harness.files.length} file(s) for "${harness.name}" (multiMode=${multiMode})`);

    try {
      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Window, title: `Installing ${harness.name}…` },
        async () => {
          // Download all harness files
          const files = new Map<string, string>();
          const failed: string[] = [];
          for (const file of harness.files) {
            log.debug(SCOPE, `  Downloading: ${file.path}`);
            const content = await this.githubService.getFileContent(file.path);
            if (content) {
              files.set(file.path, content);
              log.debug(SCOPE, `  OK: ${file.path} (${content.length} chars)`);
            } else {
              failed.push(file.path);
              log.warn(SCOPE, `  FAILED (null): ${file.path}`);
            }
          }
          log.info(SCOPE, `Download complete — ${files.size} succeeded, ${failed.length} failed`);
          if (failed.length > 0) { log.warn(SCOPE, 'Failed paths', failed); }

          if (failed.length > 0 && files.size === 0) {
            throw new Error(
              `Could not download any files for '${harness.name}'.\n\nFailed paths:\n${failed.join('\n')}\n\nCheck that these paths exist in the configured GitHub repository.`
            );
          }

          if (!multiMode) {
            // Remove the previously active harness directory (if different from this one)
            const prevActiveId = this._activeHarnessId;
            if (prevActiveId && prevActiveId !== id) {
              const prevDir = path.join(baseDir, prevActiveId);
              if (fs.existsSync(prevDir)) {
                const prevHarness = this._harnesses.find(h => h.id === prevActiveId);
                log.info(SCOPE, `Removing previously active harness: "${prevActiveId}" at ${prevDir}`);
                await this._backup.backup(prevActiveId, prevHarness?.name ?? prevActiveId, prevDir);
                await this.fileSystemManager.removeHarness(prevDir);
                log.debug(SCOPE, `Removed previous harness dir: ${prevDir}`);
              }
            }
            // Also remove any OTHER harness directories left in agent-harnesses
            for (const entry of fs.readdirSync(baseDir)) {
              const entryPath = path.join(baseDir, entry);
              if (entry !== id && fs.statSync(entryPath).isDirectory()) {
                log.info(SCOPE, `Removing leftover harness dir: ${entryPath}`);
                await this.fileSystemManager.removeHarness(entryPath);
              }
            }
          }

          // Install into agent-harnesses/<harness-id>/
          const harnessDir = path.join(baseDir, id);
          log.debug(SCOPE, `Target harness dir: ${harnessDir}`);
          if (fs.existsSync(harnessDir)) {
            log.info(SCOPE, `Backing up existing harness dir before overwrite`);
            await this._backup.backup(id, harness.name, harnessDir);
            log.debug(SCOPE, `Removing existing dir: ${harnessDir}`);
            await this.fileSystemManager.removeHarness(harnessDir);
          }
          fs.mkdirSync(harnessDir, { recursive: true });
          log.debug(SCOPE, `Created fresh harness dir: ${harnessDir}`);

          // Strip the "harnesses/<id>/" prefix from each path to get the
          // relative path within the harness, then recreate the directory tree.
          const harnessPrefix = `harnesses/${id}/`;
          const createdFiles: string[] = [];
          for (const [filePath, content] of files) {
            const relative = filePath.startsWith(harnessPrefix)
              ? filePath.slice(harnessPrefix.length)   // e.g. "hooks/session-start.sh"
              : path.basename(filePath);               // fallback for non-standard paths
            const dest = path.join(harnessDir, ...relative.split('/'));
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.writeFileSync(dest, content, 'utf8');
            createdFiles.push(dest);
            log.debug(SCOPE, `  Written: ${dest}`);
          }
          log.info(SCOPE, `Wrote ${createdFiles.length} file(s) to disk`);

          // Write AI tool pointer files in workspace root
          log.info(SCOPE, 'Writing AI tool pointer files');
          await this._writePointerFiles(wsRoot, harness, files, harnessDir, createdFiles);

          await vscode.workspace.getConfiguration('harnessManager').update('activeHarnessId', id, vscode.ConfigurationTarget.Global);
          this._activeHarnessId = id;
          log.info(SCOPE, `activeHarnessId set to "${id}"`);

          const warning = failed.length > 0 ? ` (${failed.length} file(s) skipped — not found in repo)` : '';
          vscode.window.showInformationMessage(`Installed '${harness.name}' into agent-harnesses/${id}${warning}`);
          this._send({ type: 'installed', id, success: true, activeId: id, installedIds: this._getInstalledIds() });
          this._sendHistory();
          log.info(SCOPE, `_install("${id}") — COMPLETE`);

          if (createdFiles.length > 0) {
            log.debug(SCOPE, `Opening first file: ${createdFiles[0]}`);
            await this.fileSystemManager.openFile(createdFiles[0]);
          }
        }
      );
    } catch (err) {
      log.error(SCOPE, `_install("${id}") — FAILED`, err);
      const msg = err instanceof Error ? err.message : String(err);
      vscode.window.showErrorMessage(`Harness Manager — install failed: ${msg}`);
      this._send({ type: 'installed', id, success: false });
    }
  }

  private async _openHarnessFile(harnessId: string, filePath: string): Promise<void> {
    const log = Logger.instance;
    log.info(SCOPE, `_openHarnessFile("${filePath}")`);
    try {
      const content = await this.githubService.getFileContent(filePath);
      if (!content) {
        log.warn(SCOPE, `_openHarnessFile — null content for "${filePath}"`);
        vscode.window.showErrorMessage(`Could not fetch file: ${filePath}`);
        return;
      }
      const ext = path.extname(filePath).slice(1) || 'txt';
      const langMap: Record<string, string> = {
        yaml: 'yaml', yml: 'yaml', json: 'json', md: 'markdown',
        ts: 'typescript', js: 'javascript', py: 'python', sh: 'shellscript',
      };
      const lang = langMap[ext] ?? 'plaintext';
      log.debug(SCOPE, `Opening "${filePath}" as ${lang} (${content.length} chars)`);
      const doc = await vscode.workspace.openTextDocument({ content, language: lang });
      await vscode.window.showTextDocument(doc, { preview: true, preserveFocus: false });
      log.info(SCOPE, `_openHarnessFile("${filePath}") — displayed in editor`);
    } catch (e) {
      log.error(SCOPE, `_openHarnessFile("${filePath}") failed`, e);
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
    const log = Logger.instance;
    log.info(SCOPE, `_writePointerFiles("${harness.id}") — wsRoot: ${wsRoot}`);
    try {
      // Pull the richest content available: template > README > description fallback
      const templateEntry = [...downloadedFiles.entries()].find(([p]) => p.endsWith('.yaml') || p.endsWith('.yml'));
      const readmeEntry  = [...downloadedFiles.entries()].find(([p]) => p.toLowerCase().endsWith('.md'));
      const harnessInstructions = (templateEntry ?? readmeEntry)?.[1] ?? harness.description;
      log.debug(SCOPE, `Using instructions from: ${templateEntry ? templateEntry[0] : readmeEntry ? readmeEntry[0] : 'harness.description'} (${harnessInstructions.length} chars)`);

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
      fs.writeFileSync(path.join(claudeDir, 'active-harness.md'), fullContent, 'utf8');
      log.debug(SCOPE, `Written: ${path.join(claudeDir, 'CLAUDE.md')}`);

      // ── GitHub Copilot: .github/copilot-instructions.md ─────────────────
      const githubDir = path.join(wsRoot, '.github');
      fs.mkdirSync(githubDir, { recursive: true });
      fs.writeFileSync(path.join(githubDir, 'copilot-instructions.md'), fullContent, 'utf8');
      log.debug(SCOPE, `Written: ${path.join(githubDir, 'copilot-instructions.md')}`);

      // ── Cursor: .cursorrules (legacy) + .cursor/rules/harness.mdc ───────
      fs.writeFileSync(path.join(wsRoot, '.cursorrules'), fullContent, 'utf8');
      log.debug(SCOPE, `Written: ${path.join(wsRoot, '.cursorrules')}`);

      const cursorRulesDir = path.join(wsRoot, '.cursor', 'rules');
      fs.mkdirSync(cursorRulesDir, { recursive: true });
      const mdcContent = `---\ndescription: Active harness — ${harness.name}\nalwaysApply: true\n---\n\n${fullContent}`;
      fs.writeFileSync(path.join(cursorRulesDir, 'harness.mdc'), mdcContent, 'utf8');
      log.debug(SCOPE, `Written: ${path.join(cursorRulesDir, 'harness.mdc')}`);

      // ── Windsurf: .windsurfrules + .windsurf/rules/harness.md ───────────
      fs.writeFileSync(path.join(wsRoot, '.windsurfrules'), fullContent, 'utf8');
      log.debug(SCOPE, `Written: ${path.join(wsRoot, '.windsurfrules')}`);

      const windsurfRulesDir = path.join(wsRoot, '.windsurf', 'rules');
      fs.mkdirSync(windsurfRulesDir, { recursive: true });
      fs.writeFileSync(path.join(windsurfRulesDir, 'harness.md'), fullContent, 'utf8');
      log.debug(SCOPE, `Written: ${path.join(windsurfRulesDir, 'harness.md')}`);

      log.info(SCOPE, `_writePointerFiles("${harness.id}") — all 6 pointer files written (Claude Code, Copilot, Cursor, Windsurf)`);
    } catch (e) {
      log.error(SCOPE, `_writePointerFiles("${harness.id}") failed`, e);
      vscode.window.showWarningMessage(`Harness installed but could not write AI config files: ${e instanceof Error ? e.message : e}`);
    }
  }

  private async _importHarness(source: 'folder' | 'zip'): Promise<void> {
    const log = Logger.instance;
    log.info(SCOPE, `_importHarness(source="${source}")`);

    // ── 1. Pick source ───────────────────────────────────────────────────────
    let sourceDir: string | null = null;
    let tempDir: string | null = null;

    if (source === 'folder') {
      const uris = await vscode.window.showOpenDialog({
        canSelectFolders: true, canSelectFiles: false, canSelectMany: false,
        title: 'Select harness folder to import',
      });
      if (!uris?.length) { return; }
      sourceDir = uris[0].fsPath;
      log.info(SCOPE, `Import folder: ${sourceDir}`);

    } else {
      const uris = await vscode.window.showOpenDialog({
        canSelectFolders: false, canSelectFiles: true, canSelectMany: false,
        title: 'Select harness ZIP to import',
        filters: { 'ZIP archives': ['zip'] },
      });
      if (!uris?.length) { return; }
      const zipPath = uris[0].fsPath;
      log.info(SCOPE, `Import ZIP: ${zipPath}`);

      // Extract to a temp directory in extension storage
      tempDir = path.join(this._context.globalStorageUri.fsPath, 'import-temp', String(Date.now()));
      fs.mkdirSync(tempDir, { recursive: true });
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const AdmZip: typeof import('adm-zip') = require('adm-zip');
      const zip = new (AdmZip as any)(zipPath);
      zip.extractAllTo(tempDir, true);
      log.debug(SCOPE, `ZIP extracted to: ${tempDir}`);

      // Strip single root folder if the ZIP was packed with one
      const entries = fs.readdirSync(tempDir);
      sourceDir = (entries.length === 1 && fs.statSync(path.join(tempDir, entries[0])).isDirectory())
        ? path.join(tempDir, entries[0])
        : tempDir;
    }

    // ── 2. Ask for harness name ───────────────────────────────────────────────
    const defaultName = path.basename(sourceDir);
    const name = await vscode.window.showInputBox({
      title: 'Import Harness',
      prompt: 'Harness name',
      value: defaultName,
      validateInput: v => v.trim() ? undefined : 'Name is required',
    });
    if (!name?.trim()) {
      log.info(SCOPE, '_importHarness — user cancelled name input');
      if (tempDir) { fs.rmSync(tempDir, { recursive: true, force: true }); }
      return;
    }
    const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    log.info(SCOPE, `_importHarness — harness name="${name.trim()}", id="${id}"`);

    // ── 3. Require open workspace ─────────────────────────────────────────────
    const wsRoot = this.fileSystemManager.getWorkspaceRoot();
    log.debug(SCOPE, `_importHarness — wsRoot: ${wsRoot ?? '(none)'}`);
    if (!wsRoot) {
      log.warn(SCOPE, '_importHarness — no workspace open, prompting user');
      const choice = await vscode.window.showWarningMessage(
        'No folder is open. Harness Manager needs a workspace folder to import into.',
        { modal: true }, 'Open Folder…'
      );
      log.info(SCOPE, `_importHarness — open-folder prompt response: "${choice}"`);
      if (choice === 'Open Folder…') { await vscode.commands.executeCommand('vscode.openFolder'); }
      if (tempDir) { fs.rmSync(tempDir, { recursive: true, force: true }); }
      return;
    }

    const baseDir = path.join(wsRoot, 'agent-harnesses');
    fs.mkdirSync(baseDir, { recursive: true });
    const harnessDir = path.join(baseDir, id);
    log.debug(SCOPE, `_importHarness — target harnessDir: ${harnessDir}`);

    // ── 4. Backup + overwrite prompt if already exists ────────────────────────
    if (fs.existsSync(harnessDir)) {
      log.info(SCOPE, `_importHarness — "${id}" already exists, prompting overwrite`);
      const choice = await vscode.window.showWarningMessage(
        `'${name}' already exists in agent-harnesses. Overwrite? (A backup will be saved first.)`,
        { modal: true }, 'Overwrite'
      );
      log.info(SCOPE, `_importHarness — overwrite prompt response: "${choice}"`);
      if (choice !== 'Overwrite') {
        if (tempDir) { fs.rmSync(tempDir, { recursive: true, force: true }); }
        return;
      }
      log.info(SCOPE, `_importHarness — backing up existing "${id}" before overwrite`);
      await this._backup.backup(id, name, harnessDir);
      await this.fileSystemManager.removeHarness(harnessDir);
    } else {
      log.debug(SCOPE, `_importHarness — no existing dir for "${id}", clean install`);
    }

    // ── 5. Multi-harness: clean up other dirs unless multi mode ───────────────
    const multiMode = vscode.workspace.getConfiguration('harnessManager').get<boolean>('multiHarnessInstall', false);
    log.debug(SCOPE, `_importHarness — multiHarnessInstall=${multiMode}`);
    if (!multiMode) {
      const others = fs.readdirSync(baseDir).filter(e => e !== id && fs.statSync(path.join(baseDir, e)).isDirectory());
      log.info(SCOPE, `_importHarness — replace mode: removing ${others.length} other dir(s): [${others.join(',')}]`);
      for (const entry of others) {
        const entryPath = path.join(baseDir, entry);
        log.info(SCOPE, `_importHarness — removing leftover dir: ${entryPath}`);
        await this.fileSystemManager.removeHarness(entryPath);
      }
    } else {
      log.info(SCOPE, `_importHarness — multi mode: keeping other harness dirs alongside`);
    }

    // ── 6. Copy files preserving structure ────────────────────────────────────
    log.info(SCOPE, `_importHarness — copying from ${sourceDir} → ${harnessDir}`);
    fs.mkdirSync(harnessDir, { recursive: true });
    const filesCopied = this._copyDirTo(sourceDir, harnessDir);
    log.info(SCOPE, `_importHarness — copied ${filesCopied} file(s) to ${harnessDir}`);

    // ── 7. Cleanup temp dir ───────────────────────────────────────────────────
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      log.debug(SCOPE, `_importHarness — temp dir removed: ${tempDir}`);
    }

    // ── 8. Write AI pointer files ─────────────────────────────────────────────
    const textFiles = this._readDirAsMap(harnessDir);
    log.debug(SCOPE, `_importHarness — readDirAsMap returned ${textFiles.size} text file(s) for pointer generation`);
    const fakeHarness = {
      id, name: name.trim(), description: `Imported harness: ${name.trim()}`,
      category: 'Imported', tags: [], dependencies: [], author: 'Local', version: '1.0.0', files: [],
    };
    const createdFiles = [...textFiles.keys()].map(k => path.join(harnessDir, ...k.split('/')));
    await this._writePointerFiles(wsRoot, fakeHarness as any, textFiles, harnessDir, createdFiles);

    // ── 9. Update active harness ──────────────────────────────────────────────
    log.info(SCOPE, `_importHarness — setting activeHarnessId to "${id}"`);
    await vscode.workspace.getConfiguration('harnessManager').update('activeHarnessId', id, vscode.ConfigurationTarget.Global);
    this._activeHarnessId = id;

    const installedIds = this._getInstalledIds();
    const starredIds   = this._getStarred();
    vscode.window.showInformationMessage(`Imported '${name.trim()}' into agent-harnesses/${id} — AI configs updated.`);
    this._send({ type: 'installed', id, success: true, activeId: id, installedIds, starredIds });
    this._sendHistory();
    log.info(SCOPE, `_importHarness("${id}") — COMPLETE`);
  }

  private _copyDirTo(src: string, dest: string, _relBase = ''): number {
    const log = Logger.instance;
    fs.mkdirSync(dest, { recursive: true });
    let count = 0;
    for (const item of fs.readdirSync(src)) {
      const srcItem  = path.join(src,  item);
      const destItem = path.join(dest, item);
      const rel      = _relBase ? `${_relBase}/${item}` : item;
      if (fs.statSync(srcItem).isDirectory()) {
        count += this._copyDirTo(srcItem, destItem, rel);
      } else {
        fs.copyFileSync(srcItem, destItem);
        log.debug(SCOPE, `_copyDirTo: copied ${rel}`);
        count++;
      }
    }
    return count;
  }

  private async _addFromGithub(url: string): Promise<void> {
    const log = Logger.instance;
    log.info(SCOPE, `_addFromGithub("${url}")`);
    const parsed = GitHubService.parseRepoIdentifier(url);
    if (!parsed) {
      log.warn(SCOPE, `_addFromGithub — invalid URL: "${url}"`);
      vscode.window.showErrorMessage('Invalid GitHub URL. Expected owner/repo or a GitHub repo URL.');
      return;
    }
    log.info(SCOPE, `Switching githubRepo setting to "${parsed.owner}/${parsed.repo}${parsed.branch ? `@${parsed.branch}` : ''}"`);
    const cfg = vscode.workspace.getConfiguration('harnessManager');
    await cfg.update('githubRepo', `${parsed.owner}/${parsed.repo}`, vscode.ConfigurationTarget.Global);
    if (parsed.branch) {
      await cfg.update('githubBranch', parsed.branch, vscode.ConfigurationTarget.Global);
    }
    vscode.window.showInformationMessage(`Switched harness repository to ${parsed.owner}/${parsed.repo}${parsed.branch ? `@${parsed.branch}` : ''}`);
    await this._loadAndSend(true);
  }

  private _sendHistory(): void {
    const entries = this._backup.getBackups();
    const sizeKb  = Math.round(this._backup.totalSize() / 1024);
    Logger.instance.debug(SCOPE, `_sendHistory — ${entries.length} entries, ${sizeKb} KB`);
    this._send({ type: 'history', entries, sizeKb });
  }

  private async _restoreBackup(harnessId: string, timestamp: number): Promise<void> {
    const log = Logger.instance;
    log.info(SCOPE, `_restoreBackup("${harnessId}", ts=${timestamp})`);

    const wsRoot = this.fileSystemManager.getWorkspaceRoot();
    const baseDir = wsRoot ? path.join(wsRoot, 'agent-harnesses') : null;

    // Ask whether to keep or remove other harnesses
    let keepAll = false;
    if (baseDir && fs.existsSync(baseDir)) {
      const others = fs.readdirSync(baseDir).filter(e =>
        e !== harnessId && fs.statSync(path.join(baseDir, e)).isDirectory()
      );
      if (others.length > 0) {
        log.info(SCOPE, `_restoreBackup — found ${others.length} other dir(s): [${others.join(',')}] — prompting keep/replace`);
        const choice = await vscode.window.showQuickPick(
          [
            { label: '$(trash) Replace — remove all other harnesses', keepAll: false },
            { label: '$(files) Keep all — restore alongside existing harnesses', keepAll: true },
          ],
          { title: `Restore ${harnessId} — what about the other ${others.length} harness(es) in agent-harnesses?`, placeHolder: 'Choose how to handle existing harnesses' }
        );
        if (!choice) {
          log.info(SCOPE, `_restoreBackup — user cancelled keep/replace prompt`);
          this._sendHistory();   // re-enable restore button
          return;
        }
        keepAll = choice.keepAll;
        log.info(SCOPE, `_restoreBackup — user chose keepAll=${keepAll}`);
      } else {
        log.debug(SCOPE, `_restoreBackup — no other harness dirs present, no prompt needed`);
      }
    }

    const restoredDir = await this._backup.restore(harnessId, timestamp);
    if (!restoredDir) {
      log.warn(SCOPE, `_restoreBackup("${harnessId}") — failed (backup not found or files missing)`);
      vscode.window.showErrorMessage(`Could not restore backup — files may have been deleted.`);
      return;
    }
    log.info(SCOPE, `_restoreBackup("${harnessId}") — restored to: ${restoredDir}`);

    // If replace mode, clean up all other harness directories
    if (!keepAll && baseDir && fs.existsSync(baseDir)) {
      for (const entry of fs.readdirSync(baseDir)) {
        if (entry !== harnessId) {
          const entryPath = path.join(baseDir, entry);
          if (fs.statSync(entryPath).isDirectory()) {
            log.info(SCOPE, `_restoreBackup — removing leftover dir: ${entryPath}`);
            await this.fileSystemManager.removeHarness(entryPath);
          }
        }
      }
    }

    // Update active harness setting
    log.info(SCOPE, `_restoreBackup — setting activeHarnessId to "${harnessId}"`);
    await vscode.workspace.getConfiguration('harnessManager').update('activeHarnessId', harnessId, vscode.ConfigurationTarget.Global);
    this._activeHarnessId = harnessId;

    // Update AI pointer files to reflect the restored harness content
    const harness = this._harnesses.find(h => h.id === harnessId);
    if (wsRoot && harness) {
      log.info(SCOPE, `_restoreBackup — refreshing AI pointer files from restored content`);
      const restoredFiles = this._readDirAsMap(restoredDir);
      await this._writePointerFiles(wsRoot, harness, restoredFiles, restoredDir,
        [...restoredFiles.keys()].map(k => path.join(restoredDir, ...k.split('/')))
      );
    } else {
      log.warn(SCOPE, `_restoreBackup — skipping pointer file update (wsRoot=${wsRoot}, harness found=${!!harness})`);
    }

    const installedIds = this._getInstalledIds();
    vscode.window.showInformationMessage(
      `Restored '${harnessId}' to snapshot from ${new Date(timestamp).toLocaleString()} — AI configs updated.`
    );
    this._send({ type: 'installed', id: harnessId, success: true, activeId: harnessId, installedIds });
    this._sendHistory();
  }

  /** Read all files under dir recursively into a Map<relPath, content>. */
  private _readDirAsMap(dir: string, relBase = ''): Map<string, string> {
    const log = Logger.instance;
    const map = new Map<string, string>();
    if (!fs.existsSync(dir)) {
      if (!relBase) { log.warn(SCOPE, `_readDirAsMap — dir does not exist: ${dir}`); }
      return map;
    }
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      const rel  = relBase ? `${relBase}/${item}` : item;
      if (fs.statSync(full).isDirectory()) {
        for (const [k, v] of this._readDirAsMap(full, rel)) { map.set(k, v); }
      } else {
        try {
          map.set(rel, fs.readFileSync(full, 'utf8'));
          log.debug(SCOPE, `_readDirAsMap: read ${rel}`);
        } catch {
          log.debug(SCOPE, `_readDirAsMap: skipped binary file ${rel}`);
        }
      }
    }
    if (!relBase) {
      log.debug(SCOPE, `_readDirAsMap("${dir}") — ${map.size} text file(s) read`);
    }
    return map;
  }

  private async _removeHarness(id: string): Promise<void> {
    const log = Logger.instance;
    log.info(SCOPE, `_removeHarness("${id}")`);
    const wsRoot = this.fileSystemManager.getWorkspaceRoot();
    if (!wsRoot) {
      log.warn(SCOPE, `_removeHarness("${id}") — no workspace root, aborting`);
      return;
    }
    const harnessDir = path.join(wsRoot, 'agent-harnesses', id);
    const harness = this._harnesses.find(h => h.id === id);
    if (!harness) {
      log.warn(SCOPE, `_removeHarness("${id}") — harness not in loaded list (may be imported/local); proceeding with dir removal`);
    }

    if (fs.existsSync(harnessDir)) {
      log.info(SCOPE, `_removeHarness("${id}") — backing up then deleting: ${harnessDir}`);
      await this._backup.backup(id, harness?.name ?? id, harnessDir);
      await this.fileSystemManager.removeHarness(harnessDir);
    } else {
      log.warn(SCOPE, `_removeHarness("${id}") — harnessDir not found on disk: ${harnessDir}`);
    }

    if (this._activeHarnessId === id) {
      log.info(SCOPE, `_removeHarness("${id}") — was active; clearing activeHarnessId and pointer files`);
      await vscode.workspace.getConfiguration('harnessManager').update('activeHarnessId', undefined, vscode.ConfigurationTarget.Global);
      this._activeHarnessId = undefined;
      this._clearPointerFiles(wsRoot);
    } else {
      log.debug(SCOPE, `_removeHarness("${id}") — was not active (active="${this._activeHarnessId}"), pointer files unchanged`);
    }

    vscode.window.showInformationMessage(`Removed harness '${harness?.name ?? id}'. Backup saved in Version History.`);
    const installedIds = this._getInstalledIds();
    log.info(SCOPE, `_removeHarness("${id}") — COMPLETE, remaining installed: [${installedIds.join(',')}]`);
    this._send({ type: 'installed', id, success: true, activeId: this._activeHarnessId ?? null, installedIds });
    this._sendHistory();
  }

  private _clearPointerFiles(wsRoot: string): void {
    const log = Logger.instance;
    const placeholder = `# No Active Harness\n\nInstall a harness from the Harness Manager sidebar to get started.\n`;
    const mdcPlaceholder = `---\ndescription: No active harness\nalwaysApply: false\n---\n\n${placeholder}`;
    const files: [string, string][] = [
      [path.join(wsRoot, '.claude', 'CLAUDE.md'), placeholder],
      [path.join(wsRoot, '.claude', 'active-harness.md'), placeholder],
      [path.join(wsRoot, '.github', 'copilot-instructions.md'), placeholder],
      [path.join(wsRoot, '.cursorrules'), placeholder],
      [path.join(wsRoot, '.cursor', 'rules', 'harness.mdc'), mdcPlaceholder],
      [path.join(wsRoot, '.windsurfrules'), placeholder],
      [path.join(wsRoot, '.windsurf', 'rules', 'harness.md'), placeholder],
    ];
    for (const [p, content] of files) {
      try {
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, content, 'utf8');
        log.debug(SCOPE, `_clearPointerFiles: wrote ${p}`);
      } catch (e) {
        log.warn(SCOPE, `_clearPointerFiles: failed to write ${p}`, e instanceof Error ? e.message : e);
      }
    }
  }

  private async _clearBackups(): Promise<void> {
    const log = Logger.instance;
    log.info(SCOPE, '_clearBackups — awaiting confirmation');
    const confirm = await vscode.window.showWarningMessage(
      'Delete all harness backups? This cannot be undone.',
      { modal: true },
      'Delete All'
    );
    log.info(SCOPE, `_clearBackups — user chose: "${confirm}"`);
    if (confirm !== 'Delete All') { return; }
    this._backup.clearAll();
    vscode.window.showInformationMessage('All harness backups deleted.');
    this._sendHistory();
  }

  private _send(data: object): void {
    const type = (data as any).type ?? '?';
    Logger.instance.debug(SCOPE, `→ webview: ${type}`);
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
  .harness-row.installed{border-left-color:var(--vscode-charts-blue)}
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
  .remove-btn{background:#8b2020;color:#fff;border:none;border-radius:2px;padding:2px 8px;cursor:pointer;font-size:11px;white-space:nowrap;flex-shrink:0;margin-left:6px}
  .remove-btn:hover{background:#b02828}
  .remove-btn:disabled{opacity:.55;cursor:not-allowed}
  .star-btn{background:none;border:none;cursor:pointer;font-size:13px;padding:0 4px 0 0;flex-shrink:0;line-height:1;color:var(--vscode-descriptionForeground);opacity:.6}
  .star-btn:hover{opacity:1}
  .star-btn.starred{color:#e5c000;opacity:1}
  .section-header.starred-header{background:var(--vscode-sideBarSectionHeader-background)}
  .focus-toggle{margin-left:auto;background:none;border:none;cursor:pointer;font-size:10px;color:var(--vscode-descriptionForeground);padding:0 2px;opacity:.7;white-space:nowrap}
  .focus-toggle:hover{opacity:1;color:var(--vscode-foreground)}

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

  /* ── external requirements warning ── */
  .ext-req{background:rgba(200,150,0,.1);border:1px solid rgba(200,150,0,.4);border-radius:3px;padding:6px 8px;margin-bottom:8px}
  .ext-req-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#c89600;margin-bottom:4px}
  .ext-req-list{list-style:none;padding:0;margin:0}
  .ext-req-list li{font-size:11px;color:var(--vscode-foreground);padding:1px 0 1px 14px;position:relative;line-height:1.4}
  .ext-req-list li::before{content:'•';position:absolute;left:4px;color:#c89600}

  /* ── misc ── */
  .status{padding:20px 8px;text-align:center;color:var(--vscode-descriptionForeground);font-size:12px}
  .spinner{display:inline-block;width:14px;height:14px;border:2px solid var(--vscode-descriptionForeground);border-top-color:var(--vscode-focusBorder);border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle;margin-right:6px}
  @keyframes spin{to{transform:rotate(360deg)}}
  .empty{padding:14px 8px;color:var(--vscode-descriptionForeground);font-size:12px;text-align:center}
</style>
</head>
<body>

<div class="toolbar">
    <input id="search" type="search" placeholder="Search harnesses…" oninput="onSearch()" />
    <div class="repo-info" id="repoInfo">Repository: <span class="repo-value">AdmiralGallade/harness-repository@main</span></div>
    <button title="Refresh list" onclick="refresh()">↻</button>
</div>

<div class="section" id="activeSection" style="display:none">
  <div class="section-header" style="background:rgba(0,150,0,.1);color:var(--vscode-charts-green)" onclick="toggleSection('active')">
    <span class="arrow">▾</span> ✓ Active Harnesses
  </div>
  <div class="section-body" id="activeBody"></div>
</div>

<div class="section" id="starredSection" style="display:none">
  <div class="section-header starred-header" onclick="toggleSection('starred')">
    <span class="arrow">▾</span> ★ Starred
    <button class="focus-toggle" id="focusToggleBtn" onclick="event.stopPropagation();toggleFocus()" title="Show only starred harnesses">Focus</button>
  </div>
  <div class="section-body" id="starredBody"></div>
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
  <div class="section-header collapsed" onclick="toggleSection('import')">
    <span class="arrow">▾</span> Import Harness
  </div>
  <div class="section-body hidden" id="importBody">
    <div class="form-body">
      <p style="font-size:12px;color:var(--vscode-descriptionForeground);margin-bottom:8px;line-height:1.5">Import an existing harness from your file system. Directory structure is preserved and the harness is added to version history.</p>
      <div class="btn-row">
        <button onclick="importHarness('folder')">📁 Import Folder</button>
        <button onclick="importHarness('zip')" class="secondary">📦 Import ZIP</button>
      </div>
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
      <input id="githubUrl" type="text" placeholder="https://github.com/AdmiralGallade/harness-repository"/>
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
  let installedIds = [];
  let starredIds = [];
  let openDetailId = null;
  let focusMode = false;

  // Section collapse state keyed by id suffix
  const sectionState = { active: false, starred: false, list: false, import: true, github: true, history: true };

  function toggleSection(key) {
    sectionState[key] = !sectionState[key];
    const bodyId = key + 'Body';
    const body = document.getElementById(bodyId);
    if (!body) { return; }
    const header = body.previousElementSibling;
    body.classList.toggle('hidden', sectionState[key]);
    header.classList.toggle('collapsed', sectionState[key]);
  }

  function toggleFocus() {
    focusMode = !focusMode;
    const btn = document.getElementById('focusToggleBtn');
    if (btn) { btn.textContent = focusMode ? 'Show all' : 'Focus'; btn.style.color = focusMode ? 'var(--vscode-charts-yellow,#e5c000)' : ''; }
    // Show/hide the regular harness list section
    document.getElementById('listBody').closest('.section').style.display = focusMode ? 'none' : '';
    // Re-render so non-starred are hidden inside starred list too (already handled by focusMode state)
    renderStarred();
  }

  /* ── Search ── */
  function onSearch() {
    const searchInput = document.getElementById('search');
    const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
    // In focus mode, search only within starred harnesses
    const pool = focusMode ? allHarnesses.filter(h => starredIds.includes(h.id)) : allHarnesses;
    // Installed harnesses go in Active section; starred (non-installed) go in Starred section
    // Main list shows only harnesses that are neither installed nor starred
    const mainPool = pool.filter(h => !installedIds.includes(h.id) && !starredIds.includes(h.id));
    const filtered = q
      ? mainPool.filter(h =>
          h.name.toLowerCase().includes(q) ||
          h.description.toLowerCase().includes(q) ||
          (h.tags || []).some(t => t.toLowerCase().includes(q)) ||
          h.category.toLowerCase().includes(q)
        )
      : mainPool;
    renderHarnesses(filtered);
    renderStarred();
    renderActive();
  }

  /* ── Active section — all installed harnesses ── */
  function renderActive() {
    const section = document.getElementById('activeSection');
    const body    = document.getElementById('activeBody');
    const active  = allHarnesses.filter(h => installedIds.includes(h.id));
    if (!active.length) { section.style.display = 'none'; return; }
    section.style.display = '';
    body.innerHTML = buildHarnessRows(active);
  }

  /* ── Starred section — starred harnesses that are NOT installed ── */
  function renderStarred() {
    const section = document.getElementById('starredSection');
    const body    = document.getElementById('starredBody');
    const starred = allHarnesses.filter(h => starredIds.includes(h.id) && !installedIds.includes(h.id));
    if (!starred.length) {
      section.style.display = 'none';
      if (focusMode) { focusMode = false; document.getElementById('listBody').closest('.section').style.display = ''; const btn = document.getElementById('focusToggleBtn'); if (btn) { btn.textContent = 'Focus'; btn.style.color = ''; } }
      return;
    }
    section.style.display = '';
    body.innerHTML = buildHarnessRows(starred);
  }

  /* ── Build harness rows HTML (shared between main list and starred panel) ── */
  function buildHarnessRows(harnesses) {
    const FILE_ICONS = { config: '⚙', template: '📄', documentation: '📖' };
    const parts = [];

    for (const h of harnesses) {
      const isInstalled = installedIds.includes(h.id);
      const isActive    = isInstalled;   // all installed harnesses are considered active
      const isPrimary   = h.id === activeId;  // the one whose content drives AI pointer files
      const isStarred   = starredIds.includes(h.id);
      const isOpen      = h.id === openDetailId;

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
          if (f.description) { filesHtml += '<div class="file-desc">' + esc(f.description) + '</div>'; }
        }
        filesHtml += '</ul>';
      }

      const tagPills = (h.tags && h.tags.length)
        ? '<div class="detail-tags">' + h.tags.map(t => '<span class="tag">' + esc(t) + '</span>').join('') + '</div>'
        : '';
      const depsHtml = (h.dependencies && h.dependencies.length)
        ? '<div class="detail-meta-key">Depends on</div><div class="detail-meta-val">' + esc(h.dependencies.join(', ')) + '</div>'
        : '';

      const extReqHtml = (h.externalRequirements && h.externalRequirements.length)
        ? '<div class="ext-req">'
          + '<div class="ext-req-title">⚠️ External Requirements</div>'
          + '<ul class="ext-req-list">'
          + h.externalRequirements.map(r => '<li>' + esc(r) + '</li>').join('')
          + '</ul>'
          + '</div>'
        : '';

      parts.push(
        '<div id="item-' + esc(h.id) + '" data-hid="' + esc(h.id) + '">'
        + '<div class="harness-row' + (isActive ? ' active' : (isInstalled ? ' installed' : '')) + (isOpen ? ' selected' : '') + '" data-action="toggle" data-hid="' + esc(h.id) + '">'
        +   '<button class="star-btn' + (isStarred ? ' starred' : '') + '" data-action="star" data-hid="' + esc(h.id) + '" title="' + (isStarred ? 'Unstar' : 'Star') + '">'
        +     (isStarred ? '★' : '☆')
        +   '</button>'
        +   '<span class="row-arrow' + (isOpen ? ' open' : '') + '">▶</span>'
        +   '<div class="harness-info">'
        +     '<div class="harness-name">' + esc(h.name)
        +       (isActive ? ' <span style="color:var(--vscode-charts-green);font-size:11px">✓ active' + (isPrimary ? ' · primary' : '') + '</span>' : '')
        +     '</div>'
        +     '<div class="harness-meta">' + esc(h.description) + '</div>'
        +   '</div>'
        + (isInstalled ? '<button class="remove-btn" data-action="remove" data-hid="' + esc(h.id) + '" title="Remove harness">✕</button>' : '')
        +   '<button class="install-btn' + (isActive ? ' active-btn' : '') + '" data-action="install" data-hid="' + esc(h.id) + '">'
        +     (isActive ? 'Active' : 'Install')
        +   '</button>'
        + '</div>'
        + '<div class="harness-detail' + (isOpen ? ' open' : '') + '" id="detail-' + esc(h.id) + '">'
        +   '<div class="detail-desc">' + esc(h.description) + '</div>'
        +   '<div class="detail-meta-grid">'
        +     '<div class="detail-meta-key">Author</div><div class="detail-meta-val">'   + esc(h.author  || '—') + '</div>'
        +     '<div class="detail-meta-key">Version</div><div class="detail-meta-val">'  + esc(h.version || '—') + '</div>'
        +     '<div class="detail-meta-key">Category</div><div class="detail-meta-val">' + esc(h.category)       + '</div>'
        +     depsHtml
        +   '</div>'
        +   tagPills
        +   extReqHtml
        +   filesHtml
        +   '<div class="detail-install-row" style="display:flex;gap:6px">'
        +     '<button class="' + (isActive ? 'active-btn' : '') + '" data-action="install" data-hid="' + esc(h.id) + '" style="flex:1">'
        +       (isActive ? '✓ Installed & Active' : 'Install Harness')
        +     '</button>'
        + (isInstalled ? '<button class="remove-btn" data-action="remove" data-hid="' + esc(h.id) + '">Remove</button>' : '')
        +   '</div>'
        + '</div>'
        + '</div>'
      );
    }
    return parts.join('');
  }

  /* ── Render harness list (grouped by category) ── */
  function renderHarnesses(harnesses) {
    const body = document.getElementById('listBody');
    if (!harnesses.length) {
      body.innerHTML = '<div class="empty">No harnesses found.</div>';
      return;
    }
    const byCategory = {};
    harnesses.forEach(h => { (byCategory[h.category] = byCategory[h.category] || []).push(h); });
    const parts = [];
    for (const [cat, items] of Object.entries(byCategory)) {
      parts.push('<div class="category-label">' + esc(cat) + '</div>');
      parts.push(buildHarnessRows(items));
    }
    body.innerHTML = parts.join('');
  }

  /* ── Delegated click handler (shared for listBody and starredBody) ── */
  function handleListClick(e) {
    const target = e.target;
    const actionEl = target.closest('[data-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.action;
    const id     = actionEl.dataset.hid;

    if (action === 'star') {
      e.stopPropagation();
      const isNowStarred = !starredIds.includes(id);
      if (isNowStarred) { starredIds = [...starredIds, id]; } else { starredIds = starredIds.filter(s => s !== id); }
      // Optimistically update all star buttons for this harness
      document.querySelectorAll('[data-action="star"][data-hid="' + id + '"]').forEach(b => {
        b.textContent = isNowStarred ? '★' : '☆';
        b.classList.toggle('starred', isNowStarred);
        b.title = isNowStarred ? 'Unstar' : 'Star';
      });
      vscode.postMessage({ type: 'toggleStar', id });
      renderStarred();
      return;
    }

    if (action === 'remove') {
      e.stopPropagation();
      document.querySelectorAll('[data-action="remove"][data-hid="' + id + '"]').forEach(b => {
        b.textContent = '…';
        b.disabled = true;
      });
      vscode.postMessage({ type: 'removeHarness', id });

    } else if (action === 'install') {
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
  }

  document.getElementById('listBody').addEventListener('click', handleListClick);
  document.getElementById('starredBody').addEventListener('click', handleListClick);
  document.getElementById('activeBody').addEventListener('click', handleListClick);

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

  /* ── Import harness ── */
  function importHarness(source) {
    vscode.postMessage({ type: 'importHarness', source });
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
      const liveHarness = allHarnesses.find(h => h.id === hid);
      const name = liveHarness ? liveHarness.name : (versions[0].harnessName || hid);
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
        installedIds = msg.installedIds || [];
        starredIds = msg.starredIds || [];
        if (msg.repoInfo) {
          const repoEl = document.getElementById('repoInfo');
          if (repoEl) {
            repoEl.innerHTML = 'Repository: <span class="repo-value">' + esc(msg.repoInfo.owner) + '/' + esc(msg.repoInfo.repo) + '@' + esc(msg.repoInfo.branch) + '</span>';
          }
        }
        onSearch();
        break;
      case 'error':
        document.getElementById('listBody').innerHTML =
          '<div class="status" style="color:var(--vscode-errorForeground)">' + escHtml(msg.message) + '</div>';
        break;
      case 'installed':
        if (msg.success) {
          activeId = msg.activeId || null;
          installedIds = msg.installedIds || [];
          if (msg.starredIds) { starredIds = msg.starredIds; }
          onSearch();
        } else {
          document.querySelectorAll('.install-btn:disabled, .detail-install-row button:disabled').forEach(b => {
            b.disabled = false;
            b.textContent = 'Install';
          });
          document.querySelectorAll('.remove-btn:disabled').forEach(b => {
            b.disabled = false;
            b.textContent = '✕';
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
