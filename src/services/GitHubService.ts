import * as vscode from 'vscode';
import { Octokit } from 'octokit';
import { HarnessesList, GitHubFileContent, GitHubError } from '../types/harness';
import { CacheManager } from './CacheManager';

/**
 * Service for fetching harness data from GitHub
 */
export class GitHubService {
  private octokit: Octokit;
  private cacheManager: CacheManager;
  private owner: string = '';
  private repo: string = '';

  constructor(cacheManager: CacheManager) {
    this.octokit = new Octokit();
    this.cacheManager = cacheManager;
    this.initializeRepoConfig();
  }

  /**
   * Initialize repository configuration from settings
   */
  private initializeRepoConfig(): void {
    const repoConfig = vscode.workspace.getConfiguration('harnessManager').get<string>('githubRepo', 'AdmiralGallade/harness-repository');
    const [owner, repo] = repoConfig.split('/');
    this.owner = owner;
    this.repo = repo;
  }

  /**
   * Get harnesses list from GitHub
   */
  async getHarnesesList(forceRefresh: boolean = false): Promise<HarnessesList | null> {
    try {
      // Check cache first
      if (!forceRefresh) {
        const cached = this.cacheManager.getCachedData('harnesses-list');
        if (cached) {
          console.log('Returning cached harnesses list');
          return cached as HarnessesList;
        }
      }

      // Fetch from GitHub
      const response = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: 'harnesses.json',
      });

      if (Array.isArray(response.data)) {
        throw new Error('Expected a file, got a directory');
      }

      const content = typeof (response.data as any).content === 'string'
        ? Buffer.from((response.data as any).content, 'base64').toString('utf8')
        : (response.data as any).content;

      const harnessesList = JSON.parse(content) as HarnessesList;

      // Cache the result
      await this.cacheManager.setCacheData('harnesses-list', harnessesList);

      return harnessesList;
    } catch (error) {
      console.error('Error fetching harnesses list:', error);
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to fetch harnesses list: ${message}`);
      return null;
    }
  }

  /**
   * Get a file from GitHub
   */
  async getFileContent(path: string): Promise<string | null> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: path,
      });

      if (Array.isArray(response.data)) {
        throw new Error('Expected a file, got a directory');
      }

      const content = typeof (response.data as any).content === 'string'
        ? Buffer.from((response.data as any).content, 'base64').toString('utf8')
        : (response.data as any).content;

      return content;
    } catch (error) {
      console.error(`Error fetching file ${path}:`, error);
      return null;
    }
  }

  /**
   * Get repository information
   */
  async getRepositoryInfo(): Promise<any> {
    try {
      const response = await this.octokit.rest.repos.get({
        owner: this.owner,
        repo: this.repo,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching repository info:', error);
      throw error;
    }
  }

  /**
   * Test GitHub connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getRepositoryInfo();
      return true;
    } catch (error) {
      console.error('GitHub connection test failed:', error);
      return false;
    }
  }

  /**
   * Update repository configuration
   */
  updateRepoConfig(owner: string, repo: string): void {
    this.owner = owner;
    this.repo = repo;
  }

  /**
   * Get current repository
   */
  getCurrentRepo(): { owner: string; repo: string } {
    return { owner: this.owner, repo: this.repo };
  }

  /**
   * Clear cached harnesses list
   */
  async clearCache(): Promise<void> {
    await this.cacheManager.clearCache('harnesses-list');
  }
}
