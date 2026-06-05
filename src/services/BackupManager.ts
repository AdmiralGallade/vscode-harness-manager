import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface BackupEntry {
  timestamp: number;
  label: string;       // human-readable e.g. "2024-06-05 10:32"
  harnessId: string;
  harnessName: string;
  sourceDir: string;   // original on-disk location that was backed up
  files: string[];     // filenames that were backed up
}

type Metadata = Record<string, BackupEntry[]>; // keyed by harnessId

export class BackupManager {
  private readonly backupsRoot: string;
  private readonly metaPath: string;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.backupsRoot = path.join(context.globalStorageUri.fsPath, 'harness-backups');
    this.metaPath    = path.join(this.backupsRoot, 'metadata.json');
  }

  /** Back up all files in sourceDir for harnessId before overwriting. */
  async backup(harnessId: string, harnessName: string, sourceDir: string): Promise<void> {
    if (!fs.existsSync(sourceDir)) { return; }

    const ts    = Date.now();
    const dest  = path.join(this.backupsRoot, harnessId, String(ts));
    fs.mkdirSync(dest, { recursive: true });

    const files: string[] = [];
    for (const f of fs.readdirSync(sourceDir)) {
      const src = path.join(sourceDir, f);
      if (fs.statSync(src).isFile()) {
        fs.copyFileSync(src, path.join(dest, f));
        files.push(f);
      }
    }

    const meta = this._readMeta();
    if (!meta[harnessId]) { meta[harnessId] = []; }
    meta[harnessId].unshift({
      timestamp: ts,
      label: new Date(ts).toLocaleString(),
      harnessId,
      harnessName,
      sourceDir,
      files,
    });
    this._writeMeta(meta);
  }

  /** Return all backup entries, newest first, optionally filtered by harnessId. */
  getBackups(harnessId?: string): BackupEntry[] {
    const meta = this._readMeta();
    if (harnessId) { return meta[harnessId] ?? []; }
    return Object.values(meta).flat().sort((a, b) => b.timestamp - a.timestamp);
  }

  /** Restore a specific backup to its original sourceDir. */
  async restore(harnessId: string, timestamp: number): Promise<boolean> {
    const meta    = this._readMeta();
    const entries = meta[harnessId] ?? [];
    const entry   = entries.find(e => e.timestamp === timestamp);
    if (!entry) { return false; }

    const backupDir = path.join(this.backupsRoot, harnessId, String(timestamp));
    if (!fs.existsSync(backupDir)) { return false; }

    // Backup current state before restoring (so restore itself is undoable)
    await this.backup(harnessId, entry.harnessName, entry.sourceDir);

    // Clear destination and copy backup files back
    if (fs.existsSync(entry.sourceDir)) {
      for (const f of fs.readdirSync(entry.sourceDir)) {
        fs.rmSync(path.join(entry.sourceDir, f), { force: true });
      }
    } else {
      fs.mkdirSync(entry.sourceDir, { recursive: true });
    }

    for (const f of entry.files) {
      const src = path.join(backupDir, f);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(entry.sourceDir, f));
      }
    }

    return true;
  }

  /** Delete all backups and the metadata file. */
  clearAll(): void {
    if (fs.existsSync(this.backupsRoot)) {
      fs.rmSync(this.backupsRoot, { recursive: true, force: true });
    }
  }

  /** Total size of the backups folder in bytes. */
  totalSize(): number {
    return this._dirSize(this.backupsRoot);
  }

  private _dirSize(dir: string): number {
    if (!fs.existsSync(dir)) { return 0; }
    let total = 0;
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      total += stat.isDirectory() ? this._dirSize(full) : stat.size;
    }
    return total;
  }

  private _readMeta(): Metadata {
    try {
      if (fs.existsSync(this.metaPath)) {
        return JSON.parse(fs.readFileSync(this.metaPath, 'utf8')) as Metadata;
      }
    } catch { /* corrupt — start fresh */ }
    return {};
  }

  private _writeMeta(meta: Metadata): void {
    fs.mkdirSync(path.dirname(this.metaPath), { recursive: true });
    fs.writeFileSync(this.metaPath, JSON.stringify(meta, null, 2), 'utf8');
  }
}
