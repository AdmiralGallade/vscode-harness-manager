import * as vscode from 'vscode';
import { GitHubService } from '../services/GitHubService';
import { CacheManager } from '../services/CacheManager';
import { FileSystemManager } from '../services/FileSystemManager';
import { MetadataParser } from '../services/MetadataParser';
import { QuickPickUI } from '../ui/QuickPickUI';

/**
 * Command to select and create a harness
 */
export async function selectHarnessCommand(
  context: vscode.ExtensionContext,
  githubService: GitHubService,
  cacheManager: CacheManager,
  fileSystemManager: FileSystemManager,
  metadataParser: MetadataParser
): Promise<void> {
  try {
    // Show progress
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        title: 'Loading harnesses...',
      },
      async () => {
        // Fetch harnesses list
        const harnessesList = await githubService.getHarnesesList();
        if (!harnessesList) {
          return;
        }

        const harnesses = metadataParser.parseHarnesesList(harnessesList);

        // Show Quick Pick
        const quickPickUI = new QuickPickUI(metadataParser);
        const selectedHarness = await quickPickUI.showHarnessSelection(harnesses);

        if (!selectedHarness) {
          return;
        }

        // Get target directory
        const defaultLocation = vscode.workspace.getConfiguration('harnessManager').get('defaultCreateLocation') === 'workspace-root';
        const targetPath = await fileSystemManager.getTargetDirectory(defaultLocation);

        if (!targetPath) {
          vscode.window.showWarningMessage('No target directory selected');
          return;
        }

        // Create harness files
        await createHarnessInWorkspace(
          selectedHarness.id,
          selectedHarness,
          githubService,
          fileSystemManager,
          targetPath
        );
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to select harness: ${message}`);
  }
}

/**
 * Create harness files in workspace
 */
async function createHarnessInWorkspace(
  harnessId: string,
  harness: any,
  githubService: GitHubService,
  fileSystemManager: FileSystemManager,
  targetPath: string
): Promise<void> {
  try {
    const files = new Map<string, string>();

    // Fetch all harness files
    for (const file of harness.files) {
      const content = await githubService.getFileContent(file.path);
      if (content) {
        files.set(file.path, content);
      }
    }

    // Replace existing harness or create new one
    const createdFiles = await fileSystemManager.replaceHarness(
      harnessId,
      files,
      targetPath,
      true
    );

    if (createdFiles && createdFiles.length > 0) {
      vscode.window.showInformationMessage(
        `Installed ${createdFiles.length} files for harness '${harness.name}'`
      );

      // Open first file
      await fileSystemManager.openFile(createdFiles[0]);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to create harness files: ${message}`);
  }
}
