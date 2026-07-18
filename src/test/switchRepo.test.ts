import * as vscode from 'vscode';
import { switchRepoCommand } from '../commands/switchRepo';
import { GitHubService } from '../services/GitHubService';
import { CacheManager } from '../services/CacheManager';

describe('switchRepoCommand', () => {
  let mockExtensionContext: any;
  let cacheManager: CacheManager;
  let githubService: GitHubService;

  beforeEach(() => {
    mockExtensionContext = {
      globalState: {
        get: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
        keys: jest.fn().mockReturnValue([]),
      },
    };
    cacheManager = new CacheManager(mockExtensionContext as any);
    githubService = new GitHubService(cacheManager);

    vscode.window.showInputBox = jest.fn().mockResolvedValue('AdmiralGallade/harness-repository@dev');
    vscode.window.showErrorMessage = jest.fn().mockResolvedValue(undefined);
    vscode.window.showInformationMessage = jest.fn().mockResolvedValue(undefined);

    const config = {
      get: jest.fn((key: string, defaultValue: any) => defaultValue),
      has: jest.fn(),
      inspect: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    } as any;
    jest.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue(config);
  });

  it('switches repository and branch when a URL or owner/repo string is provided', async () => {
    await switchRepoCommand(githubService, cacheManager);
    console.log('showInputBox calls', (vscode.window.showInputBox as jest.Mock).mock.calls.length);
    console.log('showErrorMessage calls', (vscode.window.showErrorMessage as jest.Mock).mock.calls.length);
    console.log('showInformationMessage calls', (vscode.window.showInformationMessage as jest.Mock).mock.calls.length);

    expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('harnessManager');
    expect(vscode.window.showInputBox).toHaveBeenCalled();
    expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      'Harness repository switched to AdmiralGallade/harness-repository@dev'
    );
    expect(githubService.getCurrentRepo().branch).toBe('dev');
  });
});
