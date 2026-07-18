import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createHarnessCommand } from '../commands/createHarness';
import { FileSystemManager } from '../services/FileSystemManager';

import * as vscode from 'vscode';

describe('createHarnessCommand', () => {
  let tempDir: string;
  let fileSystemManager: FileSystemManager;

  beforeEach(() => {
    jest.resetAllMocks();

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-manager-test-'));
    fileSystemManager = new FileSystemManager();

    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: [{ uri: { fsPath: tempDir } }],
      writable: true,
      configurable: true,
    });

    jest.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({
      get: jest.fn((key: string, defaultValue: any) => (key === 'defaultCreateLocation' ? 'workspace-root' : defaultValue)),
      has: jest.fn(),
      inspect: jest.fn(),
      update: jest.fn(),
    } as any);

    jest.spyOn(vscode.window, 'showInputBox').mockResolvedValue(undefined as unknown as string);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('creates a new harness scaffold in the workspace root', async () => {
    const inputBoxMock = jest.spyOn(vscode.window, 'showInputBox');
    inputBoxMock
      .mockResolvedValueOnce('Test Harness')
      .mockResolvedValueOnce('A harness for tests')
      .mockResolvedValueOnce('Testing')
      .mockResolvedValueOnce('Test Author')
      .mockResolvedValueOnce('0.1.0')
      .mockResolvedValueOnce('test, harness');

    await createHarnessCommand(fileSystemManager);

    const harnessDir = path.join(tempDir, 'harnesses', 'test-harness');
    expect(fs.existsSync(harnessDir)).toBe(true);

    const configPath = path.join(harnessDir, 'config.json');
    const templatePath = path.join(harnessDir, 'template.yaml');
    const readmePath = path.join(harnessDir, 'README.md');
    const manifestPath = path.join(tempDir, 'harnesses.json');

    expect(fs.existsSync(configPath)).toBe(true);
    expect(fs.existsSync(templatePath)).toBe(true);
    expect(fs.existsSync(readmePath)).toBe(true);
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest.harnesses).toHaveLength(1);
    expect(manifest.harnesses[0].id).toBe('test-harness');
    expect(manifest.harnesses[0].name).toBe('Test Harness');
    expect(manifest.harnesses[0].files).toEqual([
      { path: 'harnesses/test-harness/config.json', type: 'config', description: 'Harness metadata' },
      { path: 'harnesses/test-harness/template.yaml', type: 'template', description: 'Main harness instructions' },
      { path: 'harnesses/test-harness/README.md', type: 'documentation', description: 'Harness README' },
    ]);
  });

  test('updates harnesses.json without duplicating existing harness entries', async () => {
    const manifestPath = path.join(tempDir, 'harnesses.json');
    const initialManifest = {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      harnesses: [
        {
          id: 'existing-harness',
          name: 'Existing Harness',
          description: 'Already present',
          category: 'General',
          tags: ['existing'],
          dependencies: [],
          author: 'Author',
          version: '0.1.0',
          files: [
            { path: 'harnesses/existing-harness/config.json', type: 'config', description: 'Harness metadata' },
          ],
        },
      ],
    };
    fs.writeFileSync(manifestPath, JSON.stringify(initialManifest, null, 2), 'utf8');

    const inputBoxMock = jest.spyOn(vscode.window, 'showInputBox');
    inputBoxMock
      .mockResolvedValueOnce('Another Harness')
      .mockResolvedValueOnce('Second harness description')
      .mockResolvedValueOnce('Tools')
      .mockResolvedValueOnce('Second Author')
      .mockResolvedValueOnce('0.2.0')
      .mockResolvedValueOnce('another, harness');

    await createHarnessCommand(fileSystemManager);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest.harnesses).toHaveLength(2);
    expect(manifest.harnesses.find((entry: any) => entry.id === 'existing-harness')).toBeDefined();
    expect(manifest.harnesses.find((entry: any) => entry.id === 'another-harness')).toBeDefined();
  });
});
