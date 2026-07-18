import * as vscode from 'vscode';
import { selectHarnessCommand } from './commands/selectHarness';
import { refreshHarnessesCommand } from './commands/refreshHarnesses';
import { createHarnessCommand } from './commands/createHarness';
import { switchRepoCommand } from './commands/switchRepo';
import { GitHubService } from './services/GitHubService';
import { CacheManager } from './services/CacheManager';
import { FileSystemManager } from './services/FileSystemManager';
import { MetadataParser } from './services/MetadataParser';
import { Logger } from './services/Logger';
import { HarnessSidebarProvider } from './ui/SidebarProvider';

const SCOPE = 'extension';

let cacheManager: CacheManager;
let githubService: GitHubService;
let fileSystemManager: FileSystemManager;
let metadataParser: MetadataParser;
let sidebarProvider: HarnessSidebarProvider;

export function activate(context: vscode.ExtensionContext) {
  const log = Logger.instance;
  log.info(SCOPE, '=== Harness Manager activating ===');
  log.debug(SCOPE, 'Extension storage path', context.globalStorageUri.fsPath);
  log.debug(SCOPE, 'VS Code version', vscode.version);

  cacheManager    = new CacheManager(context);
  githubService   = new GitHubService(cacheManager);
  fileSystemManager = new FileSystemManager();
  metadataParser  = new MetadataParser();

  log.debug(SCOPE, 'Services initialised — registering sidebar provider');

  sidebarProvider = new HarnessSidebarProvider(context, githubService, fileSystemManager);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(HarnessSidebarProvider.viewType, sidebarProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );
  log.info(SCOPE, `Sidebar provider registered for view "${HarnessSidebarProvider.viewType}"`);

  const commands: { id: string; handler: (...args: any[]) => any }[] = [
    {
      id: 'harness-manager.selectHarness',
      handler: () => {
        log.info(SCOPE, 'Command: selectHarness');
        return selectHarnessCommand(context, githubService, cacheManager, fileSystemManager, metadataParser);
      },
    },
    {
      id: 'harness-manager.refreshList',
      handler: () => {
        log.info(SCOPE, 'Command: refreshList');
        refreshHarnessesCommand(githubService, cacheManager);
        sidebarProvider.refresh();
      },
    },
    {
      id: 'harness-manager.createHarness',
      handler: () => {
        log.info(SCOPE, 'Command: createHarness');
        return createHarnessCommand(fileSystemManager);
      },
    },
    {
      id: 'harness-manager.switchRepo',
      handler: async () => {
        log.info(SCOPE, 'Command: switchRepo');
        await switchRepoCommand(githubService, cacheManager);
        sidebarProvider.refresh();
      },
    },
    {
      id: 'harness-manager.openSettings',
      handler: () => {
        log.info(SCOPE, 'Command: openSettings');
        return vscode.commands.executeCommand('workbench.action.openSettings', 'harnessManager');
      },
    },
    {
      id: 'harness-manager.syncPointerFiles',
      handler: () => {
        log.info(SCOPE, 'Command: syncPointerFiles');
        return sidebarProvider.syncActiveHarness();
      },
    },
    {
      id: 'harness-manager.cleanPointerFiles',
      handler: () => {
        log.info(SCOPE, 'Command: cleanPointerFiles');
        return sidebarProvider.cleanPointerFilesCommand();
      },
    },
  ];

  for (const { id, handler } of commands) {
    context.subscriptions.push(vscode.commands.registerCommand(id, handler));
    log.debug(SCOPE, `Registered command: ${id}`);
  }

  // Status bar item reflecting the active harness; click opens the sidebar.
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.command = 'harness-manager.harnessExplorer.focus';
  context.subscriptions.push(statusBar);
  sidebarProvider.setStatusBar(statusBar);
  log.debug(SCOPE, 'Status bar item created');

  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('harnessManager')) {
      log.info(SCOPE, 'Configuration changed — reinitialising GitHubService and refreshing sidebar');
      githubService = new GitHubService(cacheManager);
      sidebarProvider.refresh();
      vscode.window.showInformationMessage('Harness Manager configuration updated');
    }
  });

  log.info(SCOPE, '=== Harness Manager activated successfully ===');
}

export function deactivate() {
  Logger.instance.info(SCOPE, '=== Harness Manager deactivating ===');
  Logger.dispose();
}
