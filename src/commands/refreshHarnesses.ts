import * as vscode from 'vscode';
import { GitHubService } from '../services/GitHubService';

/**
 * Command to refresh the harnesses list
 */
export async function refreshHarnessesCommand(
  githubService: GitHubService,
  _cacheManager?: unknown
): Promise<void> {
  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        title: 'Refreshing harnesses list...',
      },
      async () => {
        // Clear cache
        await githubService.clearCache();

        // Fetch fresh list
        const harnessesList = await githubService.getHarnesesList(true);

        if (harnessesList) {
          vscode.window.showInformationMessage('Harnesses list refreshed successfully');
        }
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to refresh harnesses: ${message}`);
  }
}
