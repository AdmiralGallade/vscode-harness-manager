import * as vscode from 'vscode';
import { HarnessDefinition } from '../types/harness';
import { GitHubService } from '../services/GitHubService';
import { MetadataParser } from '../services/MetadataParser';

/**
 * Tree view provider for harness explorer
 */
export class HarnessTreeViewProvider implements vscode.TreeDataProvider<HarnessTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<HarnessTreeItem | undefined | null | void> =
    new vscode.EventEmitter<HarnessTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<HarnessTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private harnesses: HarnessDefinition[] = [];
  private githubService: GitHubService;
  private metadataParser: MetadataParser;
  private selectedCategory: string | null = null;

  constructor(githubService: GitHubService, metadataParser: MetadataParser) {
    this.githubService = githubService;
    this.metadataParser = metadataParser;
    this.loadHarnesses();
  }

  /**
   * Load harnesses from GitHub
   */
  private async loadHarnesses(): Promise<void> {
    try {
      const list = await this.githubService.getHarnesesList();
      if (list) {
        this.harnesses = this.metadataParser.parseHarnesesList(list);
        this.refresh();
      }
    } catch (error) {
      console.error('Error loading harnesses:', error);
    }
  }

  /**
   * Get tree item
   */
  getTreeItem(element: HarnessTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children
   */
  async getChildren(element?: HarnessTreeItem): Promise<HarnessTreeItem[]> {
    if (!element) {
      // Root level: show categories
      if (this.harnesses.length === 0) {
        // Show loading state
        return [
          new HarnessTreeItem(
            'Loading harnesses...',
            vscode.TreeItemCollapsibleState.None,
            'loading'
          ),
        ];
      }
      const categories = this.metadataParser.getUniqueCategories(this.harnesses);
      return categories.map((cat) => new HarnessTreeItem(cat, vscode.TreeItemCollapsibleState.Collapsed, 'category'));
    }

    if (element.type === 'category') {
      // Category level: show harnesses in that category
      const harnessesInCategory = this.harnesses.filter((h) => h.category === element.label);
      return harnessesInCategory.map(
        (h) => new HarnessTreeItem(h.name, vscode.TreeItemCollapsibleState.None, 'harness', h)
      );
    }

    return [];
  }

  /**
   * Refresh tree
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Find harness by name
   */
  findHarnessByName(name: string): HarnessDefinition | null {
    return this.harnesses.find((h) => h.name === name) || null;
  }

  /**
   * Find harness by ID
   */
  findHarnessById(id: string): HarnessDefinition | null {
    return this.harnesses.find((h) => h.id === id) || null;
  }
}

/**
 * Tree item for harness
 */
class HarnessTreeItem extends vscode.TreeItem {
  type: 'category' | 'harness' | 'loading';
  harness?: HarnessDefinition;

  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    type: 'category' | 'harness' | 'loading',
    harness?: HarnessDefinition
  ) {
    super(label, collapsibleState);
    this.type = type;
    this.harness = harness;

    if (type === 'harness' && harness) {
      this.description = harness.tags.join(', ');
      this.tooltip = harness.description;
      this.contextValue = 'harness';
      this.iconPath = new vscode.ThemeIcon('layers');
      this.command = {
        command: 'harness-manager.viewHarnessDetails',
        title: 'View Harness Details',
        arguments: [harness.id],
      };
    } else if (type === 'category') {
      this.contextValue = 'category';
      this.iconPath = new vscode.ThemeIcon('folder');
    } else if (type === 'loading') {
      this.iconPath = new vscode.ThemeIcon('loading~spin');
    }
  }
}
