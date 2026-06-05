import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface Harness {
  name: string;
  dirPath: string;
  templateFile?: string;
  configFile?: string;
  description?: string;
}

export class HarnessItem extends vscode.TreeItem {
  constructor(
    public readonly harness: Harness,
    public readonly isActive: boolean
  ) {
    super(harness.name, vscode.TreeItemCollapsibleState.None);
    this.contextValue = 'harness';
    this.description = harness.description ?? '';
    this.tooltip = `${harness.name}\n${harness.dirPath}`;

    if (isActive) {
      this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'));
      this.description = (harness.description ? harness.description + ' ' : '') + '(active)';
    } else {
      this.iconPath = new vscode.ThemeIcon('package');
    }
  }
}

export class HarnessProvider implements vscode.TreeDataProvider<HarnessItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<HarnessItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private context: vscode.ExtensionContext) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: HarnessItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<HarnessItem[]> {
    const config = vscode.workspace.getConfiguration('harnessManager');
    const activeHarness: string = config.get('activeHarness') ?? '';
    const harnesses = await this.discoverHarnesses();

    if (harnesses.length === 0) {
      return [];
    }

    return harnesses.map(h => new HarnessItem(h, h.name === activeHarness));
  }

  private async discoverHarnesses(): Promise<Harness[]> {
    const config = vscode.workspace.getConfiguration('harnessManager');
    const extraPaths: string[] = config.get('harnessPaths') ?? [];
    const autoScan: boolean = config.get('autoScanWorkspace') ?? true;
    const pattern: string = config.get('harnessFilePattern') ?? 'template.yaml';

    const searchRoots: string[] = [...extraPaths];

    if (autoScan) {
      const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
      for (const folder of workspaceFolders) {
        searchRoots.push(folder.uri.fsPath);
      }
    }

    const harnesses: Harness[] = [];
    const seen = new Set<string>();

    for (const root of searchRoots) {
      if (!fs.existsSync(root)) {
        continue;
      }
      const entries = fs.readdirSync(root, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }
        const dirPath = path.join(root, entry.name);
        if (seen.has(dirPath)) {
          continue;
        }

        const templatePath = path.join(dirPath, pattern);
        const configPath = path.join(dirPath, 'config.json');

        if (fs.existsSync(templatePath) || fs.existsSync(configPath)) {
          seen.add(dirPath);
          harnesses.push({
            name: entry.name,
            dirPath,
            templateFile: fs.existsSync(templatePath) ? templatePath : undefined,
            configFile: fs.existsSync(configPath) ? configPath : undefined,
            description: this.readDescription(configPath),
          });
        }
      }
    }

    return harnesses.sort((a, b) => a.name.localeCompare(b.name));
  }

  private readDescription(configPath: string): string | undefined {
    if (!fs.existsSync(configPath)) {
      return undefined;
    }
    try {
      const raw = fs.readFileSync(configPath, 'utf8');
      const json = JSON.parse(raw);
      return json.description as string | undefined;
    } catch {
      return undefined;
    }
  }

  async getHarnessForItem(item: HarnessItem): Promise<Harness> {
    return item.harness;
  }
}
