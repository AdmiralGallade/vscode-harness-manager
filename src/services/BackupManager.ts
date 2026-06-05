import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './Logger';

const SCOPE = 'BackupManager';

export interface BackupEntry {
  timestamp: number;
  label: string;
  harnessId: string;
  harnessName: string;
  sourceDir: string;
  files: string[];   // relative paths from sourceDir root (preserves subdir structure)
}

type Metadata = Record<string, BackupEntry[]>;

export class BackupManager {
  private readonly backupsRoot: string;
  private readonly metaPath: string;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.backupsRoot = path.join(context.globalStorageUri.fsPath, 'harness-backups');
    this.metaPath    = path.join(this.backupsRoot, 'metadata.json');
    Logger.instance.info(SCOPE, `Backup root: ${this.backupsRoot}`);
  }

  /** Recursively back up sourceDir to a timestamped snapshot. */
  async backup(harnessId: string, harnessName: string, sourceDir: string): Promise<void> {
    const log = Logger.instance;
    log.info(SCOPE, `backup("${harnessId}") — source: ${sourceDir}`);

    if (!fs.existsSync(sourceDir)) {
      log.warn(SCOPE, `backup("${harnessId}") — source dir does not exist, skipping`);
      return;
    }

    const ts   = Date.now();
    const dest = path.join(this.backupsRoot, harnessId, String(ts));
    log.debug(SCOPE, `Creating backup snapshot: ${dest}`);
    fs.mkdirSync(dest, { recursive: true });

    // Recursively copy the entire harness directory tree
    const relFiles = this._copyDirRecursive(sourceDir, dest);
    log.info(SCOPE, `backup("${harnessId}") — saved ${relFiles.length} file(s) at ts=${ts}`);
    relFiles.forEach(f => log.debug(SCOPE, `  backed up: ${f}`));

    const meta = this._readMeta();
    if (!meta[harnessId]) { meta[harnessId] = []; }
    meta[harnessId].unshift({
      timestamp: ts,
      label: new Date(ts).toLocaleString(),
      harnessId,
      harnessName,
      sourceDir,
      files: relFiles,
    });
    this._writeMeta(meta);
  }

  getBackups(harnessId?: string): BackupEntry[] {
    const log = Logger.instance;
    const meta = this._readMeta();
    if (harnessId) {
      const entries = meta[harnessId] ?? [];
      log.debug(SCOPE, `getBackups("${harnessId}") — ${entries.length} entries`);
      return entries;
    }
    const all = Object.values(meta).flat().sort((a, b) => b.timestamp - a.timestamp);
    log.debug(SCOPE, `getBackups() — ${all.length} total entries across ${Object.keys(meta).length} harnesses`);
    return all;
  }

  /** Restore a snapshot back to its original sourceDir.
   *  Returns the sourceDir path so the caller can update AI pointer files. */
  async restore(harnessId: string, timestamp: number): Promise<string | null> {
    const log = Logger.instance;
    log.info(SCOPE, `restore("${harnessId}", ts=${timestamp})`);

    const meta    = this._readMeta();
    const entries = meta[harnessId] ?? [];
    const entry   = entries.find(e => e.timestamp === timestamp);

    if (!entry) {
      log.warn(SCOPE, `restore — no backup entry found for harnessId="${harnessId}" ts=${timestamp}`);
      return null;
    }
    log.debug(SCOPE, `restore — entry.sourceDir: "${entry.sourceDir}"`);

    const backupDir = path.join(this.backupsRoot, harnessId, String(timestamp));
    if (!fs.existsSync(backupDir)) {
      log.warn(SCOPE, `restore — backup snapshot missing on disk: ${backupDir}`);
      return null;
    }
    log.debug(SCOPE, `restore — snapshot dir: ${backupDir}`);

    // Pre-backup the CURRENT state so restore is itself undoable
    log.debug(SCOPE, `restore — pre-backing up current state`);
    await this.backup(harnessId, entry.harnessName, entry.sourceDir);

    // Wipe the target directory then replace with the snapshot
    log.debug(SCOPE, `restore — removing current contents of: ${entry.sourceDir}`);
    if (fs.existsSync(entry.sourceDir)) {
      fs.rmSync(entry.sourceDir, { recursive: true, force: true });
    }
    fs.mkdirSync(entry.sourceDir, { recursive: true });

    const restored = this._copyDirRecursive(backupDir, entry.sourceDir);
    log.info(SCOPE, `restore("${harnessId}") — restored ${restored.length} file(s) to: ${entry.sourceDir}`);
    restored.forEach(f => log.debug(SCOPE, `  restored: ${f}`));

    return entry.sourceDir;
  }

  clearAll(): void {
    const log = Logger.instance;
    const size = this.totalSize();
    log.info(SCOPE, `clearAll() — removing ${this.backupsRoot} (${Math.round(size / 1024)} KB)`);
    if (fs.existsSync(this.backupsRoot)) {
      fs.rmSync(this.backupsRoot, { recursive: true, force: true });
    }
    log.info(SCOPE, 'clearAll() — done');
  }

  totalSize(): number {
    return this._dirSize(this.backupsRoot);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /** Recursively copy src → dest. Returns list of relative file paths copied. */
  private _copyDirRecursive(src: string, dest: string, relBase = ''): string[] {
    const copied: string[] = [];
    fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      const srcItem  = path.join(src,  item);
      const destItem = path.join(dest, item);
      const rel      = relBase ? `${relBase}/${item}` : item;
      if (fs.statSync(srcItem).isDirectory()) {
        copied.push(...this._copyDirRecursive(srcItem, destItem, rel));
      } else {
        fs.copyFileSync(srcItem, destItem);
        copied.push(rel);
      }
    }
    return copied;
  }

  private _dirSize(dir: string): number {
    if (!fs.existsSync(dir)) { return 0; }
    let total = 0;
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      total += fs.statSync(full).isDirectory() ? this._dirSize(full) : fs.statSync(full).size;
    }
    return total;
  }

  private _readMeta(): Metadata {
    const log = Logger.instance;
    try {
      if (fs.existsSync(this.metaPath)) {
        const meta = JSON.parse(fs.readFileSync(this.metaPath, 'utf8')) as Metadata;
        log.debug(SCOPE, `_readMeta — loaded ${Object.keys(meta).length} harness entries`);
        return meta;
      }
    } catch (e) {
      log.warn(SCOPE, '_readMeta — corrupt metadata, starting fresh', e instanceof Error ? e.message : e);
    }
    return {};
  }

  private _writeMeta(meta: Metadata): void {
    Logger.instance.debug(SCOPE, `_writeMeta — writing ${Object.keys(meta).length} harness entries`);
    fs.mkdirSync(path.dirname(this.metaPath), { recursive: true });
    fs.writeFileSync(this.metaPath, JSON.stringify(meta, null, 2), 'utf8');
  }
}
