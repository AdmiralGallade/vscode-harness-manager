import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { FileSystemManager } from '../services/FileSystemManager';

interface HarnessManifestEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  dependencies: string[];
  author: string;
  version: string;
  files: { path: string; type: string; description: string }[];
}

export async function createHarnessCommand(
  fileSystemManager: FileSystemManager
): Promise<void> {
  try {
    const defaultLocation = vscode.workspace.getConfiguration('harnessManager').get('defaultCreateLocation') === 'workspace-root';
    const targetPath = await fileSystemManager.getTargetDirectory(defaultLocation);
    if (!targetPath) {
      return;
    }

    const name = await askForInput('Harness name', 'A short, unique harness name');
    if (!name) { return; }

    const description = await askForInput('Harness description', 'What this harness does');
    if (!description) { return; }

    const category = await askForInput('Harness category', 'General');
    if (!category) { return; }

    const author = await askForInput('Author name', 'Your Name');
    if (!author) { return; }

    const version = await askForInput('Harness version', '0.1.0');
    if (!version) { return; }

    const tagsInput = await askForInput('Tags (comma-separated)', 'ai,workflow');
    if (!tagsInput) { return; }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const id = normalizeId(name);
    if (!id) {
      vscode.window.showErrorMessage('Could not create a valid harness ID from the name. Use letters, numbers, and spaces only.');
      return;
    }

    const harnessDir = path.join(targetPath, 'harnesses', id);
    if (fs.existsSync(harnessDir)) {
      const choice = await vscode.window.showWarningMessage(
        `A harness with ID '${id}' already exists. Overwrite?`,
        { modal: true },
        'Overwrite'
      );
      if (choice !== 'Overwrite') {
        return;
      }
      fs.rmSync(harnessDir, { recursive: true, force: true });
    }

    const config = {
      id,
      name: name.trim(),
      description: description.trim(),
      category: category.trim() || 'General',
      tags,
      dependencies: [],
      author: author.trim() || 'Unknown',
      version: version.trim() || '0.1.0',
    };

    const harnessFiles = [
      {
        path: path.join('harnesses', id, 'config.json'),
        content: JSON.stringify(config, null, 2),
      },
      {
        path: path.join('harnesses', id, 'template.yaml'),
        content: `# ${name}\n\n${description || 'Describe the harness instructions here.'}\n\n# Example\n# - Add rules, prompts, or workflow files for your AI agent`,
      },
      {
        path: path.join('harnesses', id, 'README.md'),
        content: `# ${name}\n\n${description || 'A harness for AI workflows'}\n\n## Files\n\n- config.json\n- template.yaml\n\n## Usage\n\nAdd this harness to your harness repository and update your harness index.`,
      },
    ];

    fs.mkdirSync(harnessDir, { recursive: true });
    for (const file of harnessFiles) {
      fileSystemManager.writeFile(path.join(targetPath, file.path), file.content);
    }

    const manifestEntry: HarnessManifestEntry = {
      id,
      name: name.trim(),
      description: description.trim(),
      category: category.trim() || 'General',
      tags,
      dependencies: [],
      author: author.trim() || 'Unknown',
      version: version.trim() || '0.1.0',
      files: [
        { path: `harnesses/${id}/config.json`, type: 'config', description: 'Harness metadata' },
        { path: `harnesses/${id}/template.yaml`, type: 'template', description: 'Main harness instructions' },
        { path: `harnesses/${id}/README.md`, type: 'documentation', description: 'Harness README' },
      ],
    };

    await updateHarnessesManifest(targetPath, manifestEntry);

    vscode.window.showInformationMessage(`Created harness scaffold '${name}' at ${harnessDir}`);
    const readmeUri = vscode.Uri.file(path.join(harnessDir, 'README.md'));
    const document = await vscode.workspace.openTextDocument(readmeUri);
    await vscode.window.showTextDocument(document);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to create harness scaffold: ${message}`);
  }
}

async function askForInput(prompt: string, placeHolder: string): Promise<string | undefined> {
  return await vscode.window.showInputBox({
    prompt,
    placeHolder,
    value: placeHolder,
    ignoreFocusOut: true,
    validateInput: (value) => (value.trim().length === 0 ? 'Value is required' : undefined),
  });
}

function normalizeId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function updateHarnessesManifest(root: string, entry: HarnessManifestEntry): Promise<void> {
  const manifestPath = path.join(root, 'harnesses.json');
  let manifest: { version: string; lastUpdated: string; harnesses: HarnessManifestEntry[] } = {
    version: '1.0',
    lastUpdated: new Date().toISOString(),
    harnesses: [entry],
  };

  if (fs.existsSync(manifestPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as any;
      if (existing?.harnesses && Array.isArray(existing.harnesses)) {
        const filtered = existing.harnesses.filter((h: any) => h.id !== entry.id);
        manifest = {
          ...existing,
          version: existing.version || '1.0',
          lastUpdated: new Date().toISOString(),
          harnesses: [...filtered, entry],
        };
      }
    } catch {
      // If manifest is invalid, overwrite with a clean manifest.
    }
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
}
