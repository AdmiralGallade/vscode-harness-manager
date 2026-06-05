import * as vscode from 'vscode';
import { HarnessDefinition } from '../types/harness';
import { MetadataParser } from '../services/MetadataParser';

/**
 * UI for Quick Pick harness selection
 */
export class QuickPickUI {
  private metadataParser: MetadataParser;

  constructor(metadataParser: MetadataParser) {
    this.metadataParser = metadataParser;
  }

  /**
   * Show harness selection Quick Pick
   */
  async showHarnessSelection(harnesses: HarnessDefinition[]): Promise<HarnessDefinition | null> {
    const items = harnesses.map((h) => ({
      label: h.name,
      description: h.tags.join(', '),
      detail: h.description,
      harness: h,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      title: 'Select a Harness',
      placeHolder: 'Search harnesses by name, tags, or description...',
      matchOnDescription: true,
      matchOnDetail: true,
    });

    return (selected as any)?.harness || null;
  }

  /**
   * Show tag selection
   */
  async showTagSelection(tags: string[]): Promise<string | null> {
    const tagItems = tags.map((tag) => ({ label: tag }));
    const selected = await vscode.window.showQuickPick(tagItems, {
      title: 'Filter by Tag',
      placeHolder: 'Select a tag...',
      canPickMany: false,
    });

    return selected?.label || null;
  }

  /**
   * Show category selection
   */
  async showCategorySelection(categories: string[]): Promise<string | null> {
    const categoryItems = categories.map((cat) => ({ label: cat }));
    const selected = await vscode.window.showQuickPick(categoryItems, {
      title: 'Filter by Category',
      placeHolder: 'Select a category...',
      canPickMany: false,
    });

    return selected?.label || null;
  }

  /**
   * Show confirmation dialog
   */
  async showConfirmation(message: string): Promise<boolean> {
    const result = await vscode.window.showWarningMessage(message, 'Yes', 'No');
    return result === 'Yes';
  }

  /**
   * Show input box
   */
  async showInputBox(
    prompt: string,
    defaultValue?: string
  ): Promise<string | null> {
    const result = await vscode.window.showInputBox({
      prompt,
      value: defaultValue,
    });
    return result ?? null;
  }
}
