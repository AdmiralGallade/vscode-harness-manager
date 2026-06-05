# VS Code Harness Manager Extension - Setup Guide

## Prerequisites

- Node.js 18+ (https://nodejs.org/)
- npm or yarn
- VS Code 1.80+
- Git (optional)

## Installation Steps

### Step 1: Install Dependencies

Navigate to the project directory and install npm packages:

**Using PowerShell (with execution policy bypass):**
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser
npm install
```

**Using Command Prompt:**
```cmd
cd c:\Users\mailf\OneDrive\Documents\GitHub\vscode plugin
npm install
```

**Using Git Bash:**
```bash
cd /c/Users/mailf/OneDrive/Documents/GitHub/vscode\ plugin
npm install
```

### Step 2: Build the Project

After dependencies are installed, compile the TypeScript:

```bash
npm run compile
```

Or use esbuild for bundling:
```bash
npm run esbuild
```

### Step 3: Run Tests

After compiling, run the test suite:

```bash
npm test
```

Or with coverage report:
```bash
npm run test:coverage
```

### Step 4: Run Linter

Check code quality:

```bash
npm run lint
```

### Step 5: Package the Extension

Create a `.vsix` file for installation:

```bash


```

This will create a file named `harness-manager-X.X.X.vsix` in the project root.

### Step 6: Install the Extension in VS Code

**Option A: Using the VS Code UI**
1. Go to **Extensions** (Ctrl+Shift+X)
2. Click the **...** menu in the top-right
3. Select **Install from VSIX...**
4. Navigate to the `.vsix` file created in Step 5
5. Click **Open** and confirm installation

**Option B: Using the Command Line**
```bash
code --install-extension harness-manager-X.X.X.vsix
```

**Option C: Using VS Code Command Palette**
1. Open Command Palette (Ctrl+Shift+P)
2. Type: `Extensions: Install from VSIX...`
3. Select the `.vsix` file

### Step 7: Reload VS Code

After installation, reload VS Code:
- Press `Ctrl+Shift+P` and type `Developer: Reload Window`
- Or close and reopen VS Code

## Development Setup

### Debug Mode

To run the extension in debug mode with file watching:

1. Press **F5** in VS Code
2. A new VS Code window will open with the extension loaded
3. Make changes to the source code
4. Changes are automatically recompiled (if watching is enabled)

To enable watch mode:
```bash
npm run watch
```

### Available npm Scripts

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run compile` | Compile TypeScript to JavaScript |
| `npm run watch` | Watch mode (auto-compile) |
| `npm run esbuild` | Bundle with esbuild |
| `npm run esbuild-watch` | Watch mode with esbuild |
| `npm test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Run ESLint |
| `npm run vsce:package` | Package as `.vsix` file |

## Troubleshooting

### PowerShell Execution Policy Error

If you see: "File ... cannot be loaded because running scripts is disabled"

**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Or temporarily bypass:
```powershell
powershell -ExecutionPolicy Bypass -Command "npm install"
```

### npm not found

Ensure Node.js is installed and added to PATH:
```bash
node --version
npm --version
```

### Port already in use

If the extension debug port is already in use, modify the launch configuration in `.vscode/launch.json`.

### Package.json not found

Ensure you're in the correct project directory:
```bash
cd "c:\Users\mailf\OneDrive\Documents\GitHub\vscode plugin"
```

## Configuration

After installation, configure the extension in VS Code Settings (Ctrl+,):

### `harnessManager.githubRepo`
Set to your GitHub repository containing harness definitions:
```json
"harnessManager.githubRepo": "AdmiralGallade/harness-repository"
```

### `harnessManager.cacheRefreshInterval`
Set cache refresh interval in milliseconds (default: 24 hours):
```json
"harnessManager.cacheRefreshInterval": 86400000
```

### `harnessManager.defaultCreateLocation`
Set where harness files are created (default: workspace root):
```json
"harnessManager.defaultCreateLocation": "workspace-root"
```

## Usage

### Select and Create a Harness

1. Press **Ctrl+Shift+P** to open Command Palette
2. Type: **"Select and Create Harness"**
3. Choose a harness from the list
4. Select target directory
5. Files are created in your workspace
6. First file opens automatically

### Refresh Harness List

1. Press **Ctrl+Shift+P**
2. Type: **"Refresh Harness List"**
3. List is updated from GitHub

### View Harness Details

- Click on a harness in the **Harness Manager** sidebar
- Details panel opens with metadata and files

## CI/CD

The project includes GitHub Actions workflow for automated testing and building. See `.github/workflows/ci.yml`.

## Support

For issues or questions:
1. Check the README.md for general documentation
2. Review the copilot-instructions.md in `.github/`
3. Check terminal output for error messages
4. Review test output from `npm test`

## Next Steps

1. Complete the installation steps above
2. Configure your GitHub repository
3. Test the extension with sample harnesses
4. Customize harness templates in your repository

Happy coding!
