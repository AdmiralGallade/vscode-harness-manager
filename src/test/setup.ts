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
    createOutputChannel: jest.fn(() => ({
      appendLine: jest.fn(),
      show: jest.fn(),
      dispose: jest.fn(),
    })),
    createWebviewPanel: jest.fn(),
    createTreeView: jest.fn(),
    showTextDocument: jest.fn(async () => ({})),
  },
  workspace: {
    getConfiguration: jest.fn(() => ({
      get: jest.fn((key, defaultValue) => defaultValue),
    })),
    workspaceFolders: [],
    openTextDocument: jest.fn(async () => ({})),
    onDidChangeConfiguration: jest.fn(() => ({
      dispose: jest.fn(),
    })),
  },
  commands: {
    registerCommand: jest.fn(() => ({ dispose: jest.fn() })),
    executeCommand: jest.fn(),
  },
  ConfigurationTarget: {
    Global: 1,
  },
  Uri: {
    file: (path: string) => ({ fsPath: path }),
    joinPath: jest.fn((uri, ..._parts) => uri),
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
