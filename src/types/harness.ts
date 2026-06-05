/**
 * Type definitions for Harness Manager extension
 */

/**
 * A harness file with path and metadata
 */
export interface HarnessFile {
  path: string;
  type: 'config' | 'template' | 'documentation';
  description: string;
}

/**
 * A harness definition with metadata
 */
export interface HarnessDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  dependencies: string[];
  author: string;
  version: string;
  files: HarnessFile[];
}

/**
 * The harnesses manifest file
 */
export interface HarnessesList {
  version: string;
  lastUpdated: string;
  harnesses: HarnessDefinition[];
}

/**
 * Cache metadata for tracking freshness
 */
export interface CacheMetadata {
  timestamp: number;
  expiresAt: number;
  source: string;
  version: string;
}

/**
 * GitHub file content response
 */
export interface GitHubFileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir';
  content?: string;
  encoding?: string;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  _links: {
    self: string;
    git: string;
    html: string;
  };
}

/**
 * Error response from GitHub API
 */
export interface GitHubError {
  message: string;
  documentation_url?: string;
  status?: number;
}

/**
 * Harness creation options
 */
export interface HarnessCreationOptions {
  harnessId: string;
  targetPath: string;
  createSubfolder: boolean;
  overwrite: boolean;
}

/**
 * Cache options
 */
export interface CacheOptions {
  useCache: boolean;
  forceRefresh: boolean;
}
