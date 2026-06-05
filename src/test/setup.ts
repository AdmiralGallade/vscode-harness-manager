/**
 * Test setup file
 */

// Mock VS Code API if needed
jest.mock('vscode', () => ({
  window: {
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showQuickPick: jest.fn(),
    showInputBox: jest.fn(),
    withProgress: jest.fn(async (options, task) => task()),
    createWebviewPanel: jest.fn(),
    createTreeView: jest.fn(),
  },
  workspace: {
    getConfiguration: jest.fn(() => ({
      get: jest.fn((key, defaultValue) => defaultValue),
    })),
    workspaceFolders: [],
    onDidChangeConfiguration: jest.fn(() => ({
      dispose: jest.fn(),
    })),
  },
  commands: {
    registerCommand: jest.fn(() => ({ dispose: jest.fn() })),
    executeCommand: jest.fn(),
  },
  Uri: {
    file: (path: string) => ({ fsPath: path }),
    joinPath: jest.fn((uri, ...parts) => uri),
  },
  TreeItem: class {},
  TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
  ViewColumn: { One: 1 },
  ThemeIcon: jest.fn(),
  EventEmitter: class {
    fire() {}
    event = {};
  },
  ProgressLocation: { Window: 1 },
  ExtensionContext: class {},
}), { virtual: true });
