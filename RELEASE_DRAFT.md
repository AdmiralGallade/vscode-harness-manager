# Release Draft: Harness Manager v0.1.7

## Summary
Release `v0.1.7` fixes the sidebar webview regression introduced after `0.1.4` and updates the extension metadata for the next VS Code Marketplace publish.

## Highlights
- Fixed blank sidebar webview by restoring the search input and adding a guard for safer DOM access
- Improved sidebar repo display and webview ready handling
- Bumped package version to `0.1.7`
- Verified build and VSIX packaging successfully

## Changelog
- `src/ui/SidebarProvider.ts`
  - Added `search` input back into the sidebar toolbar
  - Guarded `onSearch()` to handle missing DOM elements during webview initialization
  - Added repo info display updates when harness data is loaded
- `package.json`
  - Version bumped to `0.1.7`

## Notes
- Build: `npm run compile` ✅
- VSIX package: `npm run vsce:package` ✅
- Marketplace publish attempt failed due to expired VSCE PAT

## Draft release body for GitHub
Harness Manager `v0.1.7` includes a critical UI regression fix for the sidebar webview. This release restores the harness search input and ensures the sidebar loads correctly when the webview initializes.

### Fixes
- Resolve blank sidebar webview issue
- Restore sidebar search behavior
- Improve repository display in the sidebar

### Verification
- Compiled successfully with `npm run compile`
- Packaged successfully with `npm run vsce:package`

### Publishing
A `vsce publish` attempt was blocked by an expired GitHub Marketplace Personal Access Token. Renew the PAT and rerun publishing.
