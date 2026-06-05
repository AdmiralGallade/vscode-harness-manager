import * as vscode from 'vscode';
import { CacheMetadata } from '../types/harness';

/**
 * Manages caching of harness data with expiration
 */
export class CacheManager {
  private context: vscode.ExtensionContext;
  private cachePrefix = 'harnessManager.cache.';
  private metadataPrefix = 'harnessManager.metadata.';

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Get cache refresh interval from settings
   */
  getCacheRefreshInterval(): number {
    return vscode.workspace.getConfiguration('harnessManager').get('cacheRefreshInterval', 86400000);
  }

  /**
   * Get cached data if valid
   */
  getCachedData(key: string): any {
    try {
      const cached = this.context.globalState.get<string>(this.cachePrefix + key);
      const metadata = this.context.globalState.get<CacheMetadata>(this.metadataPrefix + key);

      if (!cached || !metadata) {
        return null;
      }

      // Check if cache is expired
      if (Date.now() > metadata.expiresAt) {
        this.clearCache(key);
        return null;
      }

      return JSON.parse(cached);
    } catch (error) {
      console.error(`Error retrieving cache for ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cache data with expiration
   */
  async setCacheData(key: string, data: any): Promise<void> {
    try {
      const interval = this.getCacheRefreshInterval();
      const metadata: CacheMetadata = {
        timestamp: Date.now(),
        expiresAt: Date.now() + interval,
        source: 'github',
        version: '1.0',
      };

      await this.context.globalState.update(this.cachePrefix + key, JSON.stringify(data));
      await this.context.globalState.update(this.metadataPrefix + key, metadata);
    } catch (error) {
      console.error(`Error setting cache for ${key}:`, error);
    }
  }

  /**
   * Clear specific cache entry
   */
  async clearCache(key: string): Promise<void> {
    try {
      await this.context.globalState.update(this.cachePrefix + key, undefined);
      await this.context.globalState.update(this.metadataPrefix + key, undefined);
    } catch (error) {
      console.error(`Error clearing cache for ${key}:`, error);
    }
  }

  /**
   * Clear all cached data
   */
  async clearAllCache(): Promise<void> {
    try {
      const keys = this.context.globalState.keys();
      for (const key of keys) {
        if (key.startsWith(this.cachePrefix) || key.startsWith(this.metadataPrefix)) {
          await this.context.globalState.update(key, undefined);
        }
      }
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }

  /**
   * Check if cache is valid (not expired)
   */
  isCacheValid(key: string): boolean {
    try {
      const metadata = this.context.globalState.get<CacheMetadata>(this.metadataPrefix + key);
      if (!metadata) {
        return false;
      }
      return Date.now() <= metadata.expiresAt;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get cache age in milliseconds
   */
  getCacheAge(key: string): number | null {
    try {
      const metadata = this.context.globalState.get<CacheMetadata>(this.metadataPrefix + key);
      if (!metadata) {
        return null;
      }
      return Date.now() - metadata.timestamp;
    } catch (error) {
      return null;
    }
  }
}
