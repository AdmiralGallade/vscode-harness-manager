import * as vscode from 'vscode';
import { GitHubService } from '../services/GitHubService';
import { CacheManager } from '../services/CacheManager';

describe('GitHubService', () => {
  let mockExtensionContext: any;
  let cacheManager: CacheManager;

  beforeEach(() => {
    mockExtensionContext = {
      globalState: {
        get: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
        keys: jest.fn().mockReturnValue([]),
      },
    };
    cacheManager = new CacheManager(mockExtensionContext as any);
  });

  it('parses owner/repo strings and branch identifiers', () => {
    expect(GitHubService.parseRepoIdentifier('AdmiralGallade/harness-repository')).toEqual({
      owner: 'AdmiralGallade',
      repo: 'harness-repository',
      branch: undefined,
    });

    expect(GitHubService.parseRepoIdentifier('AdmiralGallade/harness-repository@dev')).toEqual({
      owner: 'AdmiralGallade',
      repo: 'harness-repository',
      branch: 'dev',
    });

    expect(GitHubService.parseRepoIdentifier('https://github.com/AdmiralGallade/harness-repository')).toEqual({
      owner: 'AdmiralGallade',
      repo: 'harness-repository',
      branch: undefined,
    });

    expect(GitHubService.parseRepoIdentifier('https://github.com/AdmiralGallade/harness-repository/tree/main')).toEqual({
      owner: 'AdmiralGallade',
      repo: 'harness-repository',
      branch: 'main',
    });

    expect(GitHubService.parseRepoIdentifier('https://github.com/AdmiralGallade/harness-repository#feature')).toEqual({
      owner: 'AdmiralGallade',
      repo: 'harness-repository',
      branch: 'feature',
    });
  });

  it('initializes current repo with githubBranch config when no branch is in repository string', () => {
    const config = {
      get: jest.fn((key: string, defaultValue: any) => {
        if (key === 'githubRepo') {
          return 'AdmiralGallade/harness-repository';
        }
        if (key === 'githubBranch') {
          return 'develop';
        }
        return defaultValue;
      }),
      has: jest.fn(),
      inspect: jest.fn(),
      update: jest.fn(),
    } as any;

    jest.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue(config);
    const service = new GitHubService(cacheManager);
    expect(service.getCurrentRepo()).toEqual({ owner: 'AdmiralGallade', repo: 'harness-repository', branch: 'develop' });
  });

  it('uses branch from githubRepo string when provided', () => {
    const config = {
      get: jest.fn((key: string, defaultValue: any) => {
        if (key === 'githubRepo') {
          return 'AdmiralGallade/harness-repository@feature';
        }
        if (key === 'githubBranch') {
          return 'develop';
        }
        return defaultValue;
      }),
      has: jest.fn(),
      inspect: jest.fn(),
      update: jest.fn(),
    } as any;

    jest.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue(config);
    const service = new GitHubService(cacheManager);
    expect(service.getCurrentRepo()).toEqual({ owner: 'AdmiralGallade', repo: 'harness-repository', branch: 'feature' });
  });
});
