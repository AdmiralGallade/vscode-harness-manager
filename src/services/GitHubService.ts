import * as vscode from 'vscode';
import * as https from 'https';
import { HarnessesList } from '../types/harness';
import { CacheManager } from './CacheManager';
import { Logger } from './Logger';

const SCOPE = 'GitHubService';
const TIMEOUT_MS = 15_000;
const RAW_BASE = 'https://raw.githubusercontent.com';

export class GitHubService {
  private cacheManager: CacheManager;
  private owner: string = '';
  private repo: string = '';
  private branch: string = 'main';

  constructor(cacheManager: CacheManager) {
    this.cacheManager = cacheManager;
    this.initializeRepoConfig();
  }

  private initializeRepoConfig(): void {
    const log = Logger.instance;
    const repoConfig = vscode.workspace.getConfiguration('harnessManager')
      .get<string>('githubRepo', 'AdmiralGallade/harness-repository');
    const parts = repoConfig.split('/');
    this.owner = parts[0] ?? '';
    this.repo  = parts[1] ?? '';
    if (!this.owner || !this.repo) {
      log.error(SCOPE, `Invalid githubRepo setting — expected "owner/repo", got "${repoConfig}"`);
    } else {
      log.info(SCOPE, `Repo: ${this.owner}/${this.repo} (branch: ${this.branch})`);
      log.info(SCOPE, `Using raw CDN: ${RAW_BASE}/${this.owner}/${this.repo}/${this.branch}/`);
    }
  }

  // ── Core HTTP helper ────────────────────────────────────────────────────────

  private _fetch(url: string): Promise<string> {
    const log = Logger.instance;
    log.debug(SCOPE, `GET ${url}`);

    return new Promise((resolve, reject) => {
      const req = https.get(url, { timeout: TIMEOUT_MS }, (res) => {
        log.debug(SCOPE, `  ${url} → HTTP ${res.statusCode}`);

        if (res.statusCode === 301 || res.statusCode === 302) {
          const location = res.headers.location;
          log.debug(SCOPE, `  Redirect → ${location}`);
          res.resume();
          if (location) {
            this._fetch(location).then(resolve).catch(reject);
          } else {
            reject(new Error(`Redirect with no Location header from ${url}`));
          }
          return;
        }

        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
          return;
        }

        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        res.on('error', reject);
      });

      req.on('timeout', () => {
        req.destroy();
        log.error(SCOPE, `Request timed out after ${TIMEOUT_MS}ms: ${url}`);
        reject(new Error(`Request timed out after ${TIMEOUT_MS / 1000}s: ${url}`));
      });

      req.on('error', (err) => {
        log.error(SCOPE, `Request error for ${url}`, err);
        reject(err);
      });
    });
  }

  private _rawUrl(filePath: string): string {
    return `${RAW_BASE}/${this.owner}/${this.repo}/${this.branch}/${filePath}`;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  async getHarnesesList(forceRefresh = false): Promise<HarnessesList | null> {
    const log = Logger.instance;
    log.info(SCOPE, `getHarnesesList() — forceRefresh=${forceRefresh}`);

    if (!forceRefresh) {
      const cached = this.cacheManager.getCachedData('harnesses-list');
      if (cached) {
        const list = cached as HarnessesList;
        log.info(SCOPE, `Cache hit — returning ${list.harnesses?.length ?? 0} harnesses`);
        return list;
      }
      log.debug(SCOPE, 'Cache miss — fetching from CDN');
    } else {
      log.debug(SCOPE, 'Force refresh — bypassing cache');
    }

    try {
      const url  = this._rawUrl('harnesses.json');
      const raw  = await this._fetch(url);
      const text = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
      log.debug(SCOPE, `harnesses.json fetched — ${text.length} chars`);

      const list = JSON.parse(text) as HarnessesList;
      log.info(SCOPE, `Parsed ${list.harnesses?.length ?? 0} harnesses (v${list.version}, updated ${list.lastUpdated})`);

      await this.cacheManager.setCacheData('harnesses-list', list);
      log.debug(SCOPE, 'Harnesses list written to cache');
      return list;
    } catch (err) {
      log.error(SCOPE, 'getHarnesesList failed', err);
      const msg = err instanceof Error ? err.message : String(err);
      vscode.window.showErrorMessage(`Harness Manager: failed to load harnesses — ${msg}`);
      return null;
    }
  }

  async getFileContent(filePath: string): Promise<string | null> {
    const log = Logger.instance;
    log.debug(SCOPE, `getFileContent("${filePath}")`);
    try {
      const url     = this._rawUrl(filePath);
      const content = await this._fetch(url);
      log.debug(SCOPE, `getFileContent("${filePath}") — OK, ${content.length} chars`);
      return content;
    } catch (err) {
      log.warn(SCOPE, `getFileContent("${filePath}") failed`, err instanceof Error ? err.message : err);
      return null;
    }
  }

  async testConnection(): Promise<boolean> {
    const log = Logger.instance;
    log.info(SCOPE, `testConnection() — ${this.owner}/${this.repo}`);
    try {
      await this._fetch(this._rawUrl('harnesses.json'));
      log.info(SCOPE, 'testConnection() — SUCCESS');
      return true;
    } catch (err) {
      log.warn(SCOPE, 'testConnection() — FAILED', err instanceof Error ? err.message : err);
      return false;
    }
  }

  updateRepoConfig(owner: string, repo: string): void {
    Logger.instance.info(SCOPE, `updateRepoConfig: ${owner}/${repo}`);
    this.owner = owner;
    this.repo  = repo;
  }

  getCurrentRepo(): { owner: string; repo: string } {
    return { owner: this.owner, repo: this.repo };
  }

  async clearCache(): Promise<void> {
    Logger.instance.info(SCOPE, 'clearCache()');
    await this.cacheManager.clearCache('harnesses-list');
  }
}
