import * as vscode from 'vscode';
import * as path from 'path';
import { HarnessProvider, HarnessItem } from './harnessProvider';

export function activate(context: vscode.ExtensionContext) {
  const provider = new HarnessProvider(context);

  const treeView = vscode.window.createTreeView('harnessManagerView', {
    treeDataProvider: provider,
    showCollapseAll: false,
  });

  context.subscriptions.push(treeView);

  context.subscriptions.push(
    vscode.commands.registerCommand('harnessManager.refresh', () => {
      provider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('harnessManager.activateHarness', async (item: HarnessItem) => {
      const config = vscode.workspace.getConfiguration('harnessManager');
      await config.update('activeHarness', item.harness.name, vscode.ConfigurationTarget.Workspace);
      provider.refresh();
      vscode.window.showInformationMessage(`Activated harness: ${item.harness.name}`);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('harnessManager.openHarness', async (item: HarnessItem) => {
      const fileToOpen = item.harness.templateFile ?? item.harness.configFile;
      if (fileToOpen) {
        const doc = await vscode.workspace.openTextDocument(fileToOpen);
        await vscode.window.showTextDocument(doc);
      } else {
        vscode.window.showWarningMessage(`No file found for harness: ${item.harness.name}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('harnessManager.addHarnessDirectory', async () => {
      const result = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: 'Select Harness Directory',
      });

      if (!result || result.length === 0) {
        return;
      }

      const selectedPath = result[0].fsPath;
      const config = vscode.workspace.getConfiguration('harnessManager');
      const existing: string[] = config.get('harnessPaths') ?? [];

      if (!existing.includes(selectedPath)) {
        await config.update(
          'harnessPaths',
          [...existing, selectedPath],
          vscode.ConfigurationTarget.Workspace
        );
        provider.refresh();
        vscode.window.showInformationMessage(`Added harness directory: ${path.basename(selectedPath)}`);
      } else {
        vscode.window.showInformationMessage('Directory is already in the harness paths.');
      }
    })
  );

  // Refresh when workspace config changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('harnessManager')) {
        provider.refresh();
      }
    })
  );
}

export function deactivate() {}
