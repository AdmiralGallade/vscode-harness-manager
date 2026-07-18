/**
 * Registry of "pointer file" targets — the per-tool instruction files that
 * Harness Manager writes into a workspace when a harness is installed.
 *
 * Each AI coding assistant looks for its own file(s). AGENTS.md is the
 * cross-tool standard (stewarded by the Linux Foundation's Agentic AI
 * Foundation) that most modern agents read natively, so it is included and
 * enabled by default alongside the tool-specific files.
 */

export type TargetId =
  | 'agents'
  | 'claude'
  | 'copilot'
  | 'cursor'
  | 'windsurf'
  | 'cline'
  | 'roo'
  | 'gemini'
  | 'aider'
  | 'junie';

export interface TargetFile {
  /** Workspace-relative path, always using "/" separators. */
  relPath: string;
  /**
   * Optional transform applied to the shared body before writing (e.g. to add
   * front-matter). When omitted the body is written verbatim.
   */
  wrap?: (body: string, ctx: { name: string; placeholder: boolean }) => string;
}

export interface PointerTarget {
  id: TargetId;
  label: string;
  files: TargetFile[];
}

/** Cursor `.mdc` rule files require YAML front-matter. */
const mdcWrap = (body: string, ctx: { name: string; placeholder: boolean }): string =>
  `---\ndescription: ${ctx.placeholder ? 'No active harness' : `Active harness — ${ctx.name}`}\nalwaysApply: ${ctx.placeholder ? 'false' : 'true'}\n---\n\n${body}`;

/**
 * The full set of supported targets. Order is intentional: AGENTS.md first as
 * the recommended source of truth, then the tool-specific files.
 */
export const POINTER_TARGETS: PointerTarget[] = [
  {
    id: 'agents',
    label: 'AGENTS.md (cross-tool standard)',
    files: [{ relPath: 'AGENTS.md' }],
  },
  {
    id: 'claude',
    label: 'Claude Code',
    files: [{ relPath: '.claude/CLAUDE.md' }, { relPath: '.claude/active-harness.md' }],
  },
  {
    id: 'copilot',
    label: 'GitHub Copilot',
    files: [{ relPath: '.github/copilot-instructions.md' }],
  },
  {
    id: 'cursor',
    label: 'Cursor',
    files: [{ relPath: '.cursorrules' }, { relPath: '.cursor/rules/harness.mdc', wrap: mdcWrap }],
  },
  {
    id: 'windsurf',
    label: 'Windsurf',
    files: [{ relPath: '.windsurfrules' }, { relPath: '.windsurf/rules/harness.md' }],
  },
  {
    id: 'cline',
    label: 'Cline',
    files: [{ relPath: '.clinerules' }],
  },
  {
    id: 'roo',
    label: 'Roo Code',
    files: [{ relPath: '.roo/rules/harness.md' }],
  },
  {
    id: 'gemini',
    label: 'Gemini CLI',
    files: [{ relPath: 'GEMINI.md' }],
  },
  {
    id: 'aider',
    label: 'Aider',
    files: [{ relPath: 'CONVENTIONS.md' }],
  },
  {
    id: 'junie',
    label: 'JetBrains Junie',
    files: [{ relPath: '.junie/guidelines.md' }],
  },
];

/** Every known target id, in registry order. */
export const ALL_TARGET_IDS: TargetId[] = POINTER_TARGETS.map((t) => t.id);

/**
 * Resolve the enabled targets from the user's configured id list. An empty or
 * missing list means "all targets" so a fresh install writes everything.
 */
export function getEnabledTargets(enabledIds: string[] | undefined | null): PointerTarget[] {
  if (!enabledIds || enabledIds.length === 0) {
    return POINTER_TARGETS;
  }
  const set = new Set(enabledIds);
  return POINTER_TARGETS.filter((t) => set.has(t.id));
}
