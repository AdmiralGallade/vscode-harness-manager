import * as vscode from 'vscode';
import { selectHarnessCommand } from './commands/selectHarness';
import { refreshHarnessesCommand } from './commands/refreshHarnesses';
import { GitHubService } from './services/GitHubService';
import { CacheManager } from './services/CacheManager';
import { FileSystemManager } from './services/FileSystemManager';
import { MetadataParser } from './services/MetadataParser';
import { HarnessSidebarProvider } from './ui/SidebarProvider';

let cacheManager: CacheManager;
let githubService: GitHubService;
let fileSystemManager: FileSystemManager;
let metadataParser: MetadataParser;
let sidebarProvider: HarnessSidebarProvider;

export function activate(context: vscode.ExtensionContext) {
  console.log('Harness Manager extension activated');

  cacheManager = new CacheManager(context);
  githubService = new GitHubService(cacheManager);
  fileSystemManager = new FileSystemManager();
  metadataParser = new MetadataParser();

  // Register the sidebar webview view provider
  sidebarProvider = new HarnessSidebarProvider(context, githubService, fileSystemManager);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(HarnessSidebarProvider.viewType, sidebarProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );

  // Register commands
  const commands: { id: string; handler: (...args: any[]) => any }[] = [
    {
      id: 'harness-manager.selectHarness',
      handler: () => selectHarnessCommand(context, githubService, cacheManager, fileSystemManager, metadataParser),
    },
    {
      id: 'harness-manager.refreshList',
      handler: () => {
        refreshHarnessesCommand(githubService, cacheManager);
        sidebarProvider.refresh();
      },
    },
    {
      id: 'harness-manager.openSettings',
      handler: () => vscode.commands.executeCommand('workbench.action.openSettings', 'harnessManager'),
    },
  ];

  for (const { id, handler } of commands) {
    context.subscriptions.push(vscode.commands.registerCommand(id, handler));
  }

  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('harnessManager')) {
      githubService = new GitHubService(cacheManager);
      sidebarProvider.refresh();
      vscode.window.showInformationMessage('Harness Manager configuration updated');
    }
  });
}

export function deactivate() {
  console.log('Harness Manager extension deactivated');
}
