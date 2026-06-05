import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Service for managing file system operations
 */
export class FileSystemManager {
  /**
   * Get the target directory for creating harness files
   */
  async getTargetDirectory(defaultLocation: boolean = true): Promise<string | null> {
    if (defaultLocation) {
      // Use workspace root
      if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        return vscode.workspace.workspaceFolders[0].uri.fsPath;
      }
    }

    // Prompt user to select folder
    const folderUri = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
      title: 'Select target directory for harness files',
    });

    if (folderUri && folderUri.length > 0) {
      return folderUri[0].fsPath;
    }

    return null;
  }

  /**
   * Create harness files in the workspace
   */
  async createHarnessFiles(
    harnessId: string,
    files: Map<string, string>,
    targetPath: string,
    createSubfolder: boolean = true
  ): Promise<string[] | null> {
    try {
      let basePath = targetPath;

      if (createSubfolder) {
        basePath = path.join(targetPath, harnessId);
        if (!fs.existsSync(basePath)) {
          fs.mkdirSync(basePath, { recursive: true });
        }
      }

      const createdFiles: string[] = [];

      for (const [filePath, content] of files) {
        const fileName = path.basename(filePath);
        const fullPath = path.join(basePath, fileName);

        // Create directories if needed
        const dirPath = path.dirname(fullPath);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }

        // Write file
        fs.writeFileSync(fullPath, content, 'utf8');
        createdFiles.push(fullPath);
      }

      return createdFiles;
    } catch (error) {
      console.error('Error creating harness files:', error);
      throw error;
    }
  }

  /**
   * Check if path exists
   */
  pathExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  /**
   * Check if path is directory
   */
  isDirectory(filePath: string): boolean {
    try {
      return fs.statSync(filePath).isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Read file content
   */
  readFile(filePath: string): string {
    return fs.readFileSync(filePath, 'utf8');
  }

  /**
   * Write file content
   */
  writeFile(filePath: string, content: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf8');
  }

  /**
   * Get workspace root directory
   */
  getWorkspaceRoot(): string | null {
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      return vscode.workspace.workspaceFolders[0].uri.fsPath;
    }
    return null;
  }

  /**
   * Remove a harness directory
   */
  async removeHarness(harnessPath: string): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Logger } = require('./Logger');
    const log = Logger.instance;
    log.info('FileSystemManager', `removeHarness: ${harnessPath}`);
    try {
      if (fs.existsSync(harnessPath)) {
        fs.rmSync(harnessPath, { recursive: true, force: true });
        if (fs.existsSync(harnessPath)) {
          log.warn('FileSystemManager', `removeHarness: path still exists after rmSync — ${harnessPath}`);
          return false;
        }
        log.info('FileSystemManager', `removeHarness: deleted OK — ${harnessPath}`);
        return true;
      }
      log.debug('FileSystemManager', `removeHarness: path did not exist — ${harnessPath}`);
      return false;
    } catch (error) {
      log.error('FileSystemManager', `removeHarness failed: ${harnessPath}`, error);
      throw error;
    }
  }

  /**
   * Replace harness files (remove old, create new)
   */
  async replaceHarness(
    harnessId: string,
    files: Map<string, string>,
    targetPath: string,
    createSubfolder: boolean = true
  ): Promise<string[] | null> {
    try {
      let basePath = targetPath;

      if (createSubfolder) {
        basePath = path.join(targetPath, harnessId);
        
        // Remove existing harness if it exists
        if (fs.existsSync(basePath)) {
          await this.removeHarness(basePath);
          console.log(`Replaced existing harness at: ${basePath}`);
        }

        // Create fresh directory
        fs.mkdirSync(basePath, { recursive: true });
      }

      const createdFiles: string[] = [];

      for (const [filePath, content] of files) {
        const fileName = path.basename(filePath);
        const fullPath = path.join(basePath, fileName);

        // Create directories if needed
        const dirPath = path.dirname(fullPath);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }

        // Write file
        fs.writeFileSync(fullPath, content, 'utf8');
        createdFiles.push(fullPath);
      }

      return createdFiles;
    } catch (error) {
      console.error('Error replacing harness files:', error);
      throw error;
    }
  }

  /**
   * Open a file in the editor
   */
  async openFile(filePath: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
  }

  /**
   * Get list of installed harnesses in a directory
   */
  getInstalledHarnesses(targetPath: string): string[] {
    try {
      if (!fs.existsSync(targetPath)) {
        return [];
      }

      const items = fs.readdirSync(targetPath);
      const harnesses: string[] = [];

      for (const item of items) {
        const itemPath = path.join(targetPath, item);
        if (this.isDirectory(itemPath)) {
          // Check if it looks like a harness directory (has config files)
          const hasHarnessMarkers = fs.readdirSync(itemPath).some(
            (f) => f.endsWith('.yaml') || f.endsWith('.yml') || f.endsWith('.json') || f === 'README.md'
          );
          if (hasHarnessMarkers) {
            harnesses.push(item);
          }
        }
      }

      return harnesses;
    } catch (error) {
      console.error('Error getting installed harnesses:', error);
      return [];
    }
  }
}
