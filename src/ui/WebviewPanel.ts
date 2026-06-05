import * as vscode from 'vscode';
import { HarnessDefinition } from '../types/harness';

/**
 * Webview panel for displaying harness details
 */
export class HarnessWebviewPanel {
  private static currentPanel: HarnessWebviewPanel | undefined;
  private panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel) {
    this.panel = panel;
  }

  /**
   * Create or show harness detail panel
   */
  static createOrShow(
    extensionUri: vscode.Uri,
    harness: HarnessDefinition
  ): HarnessWebviewPanel {
    const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

    if (HarnessWebviewPanel.currentPanel) {
      HarnessWebviewPanel.currentPanel.panel.reveal(column);
      HarnessWebviewPanel.currentPanel.updateContent(harness);
      return HarnessWebviewPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'harnessDetails',
      `Harness: ${harness.name}`,
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
      }
    );

    HarnessWebviewPanel.currentPanel = new HarnessWebviewPanel(panel);
    HarnessWebviewPanel.currentPanel.updateContent(harness);

    return HarnessWebviewPanel.currentPanel;
  }

  /**
   * Update webview content
   */
  private updateContent(harness: HarnessDefinition): void {
    this.panel.webview.html = this.getHtmlContent(harness);
  }

  /**
   * Get HTML content for harness details
   */
  private getHtmlContent(harness: HarnessDefinition): string {
    const filesHtml = harness.files
      .map(
        (f) => `
        <div class="file-item">
          <span class="file-path">${f.path}</span>
          <span class="file-type">${f.type}</span>
          <p>${f.description}</p>
        </div>
      `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${harness.name}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            line-height: 1.6;
          }
          .container {
            max-width: 900px;
            margin: 0 auto;
          }
          h1 {
            color: var(--vscode-editor-foreground);
            margin-bottom: 10px;
            font-size: 28px;
          }
          .header {
            border-bottom: 1px solid var(--vscode-border);
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .meta {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            margin-top: 10px;
            font-size: 14px;
          }
          .meta-item {
            display: flex;
            flex-direction: column;
          }
          .meta-label {
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .meta-value {
            color: var(--vscode-foreground);
          }
          .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
          }
          .tag {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
          }
          .description {
            margin: 20px 0;
            padding: 15px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-left: 3px solid var(--vscode-textBlockQuote-border);
            border-radius: 4px;
          }
          h2 {
            font-size: 18px;
            margin-top: 25px;
            margin-bottom: 15px;
            color: var(--vscode-editor-foreground);
          }
          .files {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .file-item {
            padding: 12px;
            background-color: var(--vscode-list-hoverBackground);
            border: 1px solid var(--vscode-border);
            border-radius: 4px;
          }
          .file-path {
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            display: block;
            margin-bottom: 6px;
          }
          .file-type {
            display: inline-block;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
            margin-bottom: 6px;
          }
          .file-item p {
            font-size: 13px;
            color: var(--vscode-foreground);
          }
          .dependencies {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
          }
          .dependency {
            background-color: var(--vscode-list-activeSelectionBackground);
            color: var(--vscode-list-activeSelectionForeground);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
          }
          .empty {
            color: var(--vscode-descriptionForeground);
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${harness.name}</h1>
            <div class="meta">
              <div class="meta-item">
                <span class="meta-label">Category</span>
                <span class="meta-value">${harness.category}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Version</span>
                <span class="meta-value">${harness.version}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Author</span>
                <span class="meta-value">${harness.author}</span>
              </div>
            </div>
            <div class="tags">
              ${harness.tags.map((tag) => `<span class="tag">${tag}</span>`).join('')}
            </div>
          </div>

          <div class="description">
            ${harness.description}
          </div>

          ${
            harness.dependencies.length > 0
              ? `
            <h2>Dependencies</h2>
            <div class="dependencies">
              ${harness.dependencies.map((dep) => `<span class="dependency">${dep}</span>`).join('')}
            </div>
          `
              : '<div class="empty"><em>No dependencies</em></div>'
          }

          <h2>Files</h2>
          <div class="files">
            ${filesHtml || '<p class="empty">No files available</p>'}
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    HarnessWebviewPanel.currentPanel = undefined;
    this.panel.dispose();

    while (this.disposables.length) {
      const d = this.disposables.pop();
      if (d) {
        d.dispose();
      }
    }
  }
}
