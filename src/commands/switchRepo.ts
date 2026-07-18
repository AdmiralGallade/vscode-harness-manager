import * as vscode from 'vscode';
import { GitHubService } from '../services/GitHubService';
import { CacheManager } from '../services/CacheManager';

export async function switchRepoCommand(
  githubService: GitHubService,
  _cacheManager: CacheManager
): Promise<void> {
  try {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter a GitHub harness repository (owner/repo or URL)',
      placeHolder: 'AdmiralGallade/harness-repository or https://github.com/AdmiralGallade/harness-repository',
      ignoreFocusOut: true,
    });

    if (!input) {
      return;
    }

    const parsed = GitHubService.parseRepoIdentifier(input);
    if (!parsed) {
      vscode.window.showErrorMessage('Invalid GitHub repository. Use owner/repo or a GitHub repo URL.');
      return;
    }

    const config = vscode.workspace.getConfiguration('harnessManager');
    await config.update('githubRepo', `${parsed.owner}/${parsed.repo}`, vscode.ConfigurationTarget.Global);
    if (parsed.branch) {
      await config.update('githubBranch', parsed.branch, vscode.ConfigurationTarget.Global);
    }

    githubService.updateRepoConfig(parsed.owner, parsed.repo, parsed.branch);
    await githubService.clearCache();

    vscode.window.showInformationMessage(
      `Harness repository switched to ${parsed.owner}/${parsed.repo}${parsed.branch ? `@${parsed.branch}` : ''}`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Could not switch harness repository: ${message}`);
  }
}
