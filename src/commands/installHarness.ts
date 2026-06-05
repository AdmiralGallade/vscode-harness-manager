import * as vscode from 'vscode';
import { GitHubService } from '../services/GitHubService';
import { FileSystemManager } from '../services/FileSystemManager';
import { HarnessDefinition } from '../types/harness';

/**
 * Command to install a harness directly from the tree view
 */
export async function installHarnessCommand(
  harness: HarnessDefinition,
  githubService: GitHubService,
  fileSystemManager: FileSystemManager
): Promise<void> {
  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        title: `Installing harness: ${harness.name}...`,
      },
      async () => {
        const files = new Map<string, string>();

        // Fetch all harness files
        for (const file of harness.files) {
          const content = await githubService.getFileContent(file.path);
          if (content) {
            files.set(file.path, content);
          }
        }

        // Get target directory
        const defaultLocation = vscode.workspace.getConfiguration('harnessManager').get('defaultCreateLocation') === 'workspace-root';
        const targetPath = await fileSystemManager.getTargetDirectory(defaultLocation);

        if (!targetPath) {
          vscode.window.showWarningMessage('No target directory selected');
          return;
        }

        // Replace existing harness or create new one
        const createdFiles = await fileSystemManager.replaceHarness(
          harness.id,
          files,
          targetPath,
          true
        );

        if (createdFiles && createdFiles.length > 0) {
          vscode.window.showInformationMessage(
            `Successfully installed harness '${harness.name}' with ${createdFiles.length} files`
          );

          // Open first file
          if (createdFiles.length > 0) {
            await fileSystemManager.openFile(createdFiles[0]);
          }
        }
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to install harness: ${message}`);
  }
}
