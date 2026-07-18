import {
  POINTER_TARGETS,
  ALL_TARGET_IDS,
  getEnabledTargets,
} from '../services/PointerTargets';

describe('PointerTargets registry', () => {
  it('includes AGENTS.md as the cross-tool standard target', () => {
    const agents = POINTER_TARGETS.find((t) => t.id === 'agents');
    expect(agents).toBeDefined();
    expect(agents!.files.map((f) => f.relPath)).toContain('AGENTS.md');
  });

  it('covers all documented tool targets', () => {
    expect(ALL_TARGET_IDS).toEqual(
      expect.arrayContaining([
        'agents', 'claude', 'copilot', 'cursor', 'windsurf',
        'cline', 'roo', 'gemini', 'aider', 'junie',
      ])
    );
  });

  it('maps each new tool to its expected file path', () => {
    const pathOf = (id: string) =>
      POINTER_TARGETS.find((t) => t.id === id)!.files.map((f) => f.relPath);
    expect(pathOf('cline')).toContain('.clinerules');
    expect(pathOf('roo')).toContain('.roo/rules/harness.md');
    expect(pathOf('gemini')).toContain('GEMINI.md');
    expect(pathOf('aider')).toContain('CONVENTIONS.md');
    expect(pathOf('junie')).toContain('.junie/guidelines.md');
  });

  it('uses relative paths with forward slashes only (no backslashes)', () => {
    for (const target of POINTER_TARGETS) {
      for (const file of target.files) {
        expect(file.relPath).not.toMatch(/\\/);
        expect(file.relPath.startsWith('/')).toBe(false);
      }
    }
  });
});

describe('getEnabledTargets', () => {
  it('returns all targets when the list is empty, null, or undefined', () => {
    expect(getEnabledTargets(undefined)).toHaveLength(POINTER_TARGETS.length);
    expect(getEnabledTargets(null)).toHaveLength(POINTER_TARGETS.length);
    expect(getEnabledTargets([])).toHaveLength(POINTER_TARGETS.length);
  });

  it('filters to only the configured ids, preserving registry order', () => {
    const enabled = getEnabledTargets(['claude', 'agents']);
    expect(enabled.map((t) => t.id)).toEqual(['agents', 'claude']);
  });

  it('ignores unknown ids', () => {
    const enabled = getEnabledTargets(['claude', 'not-a-real-tool']);
    expect(enabled.map((t) => t.id)).toEqual(['claude']);
  });
});

describe('Cursor .mdc front-matter wrap', () => {
  const mdcFile = POINTER_TARGETS.find((t) => t.id === 'cursor')!.files.find(
    (f) => f.relPath.endsWith('.mdc')
  )!;

  it('adds alwaysApply:true front-matter for an active harness', () => {
    const out = mdcFile.wrap!('BODY', { name: 'My Harness', placeholder: false });
    expect(out).toContain('alwaysApply: true');
    expect(out).toContain('description: Active harness — My Harness');
    expect(out.trimEnd().endsWith('BODY')).toBe(true);
  });

  it('adds alwaysApply:false front-matter for the placeholder', () => {
    const out = mdcFile.wrap!('BODY', { name: '', placeholder: true });
    expect(out).toContain('alwaysApply: false');
    expect(out).toContain('description: No active harness');
  });
});
