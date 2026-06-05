---
name: dev-init
description: "Use when a project has no .dev-wiki/ yet. Bootstraps phases, architecture, state, and tasks. Do NOT use for knowledge wikis (use wiki-init) or if .dev-wiki/ already exists."
reads: []
writes: [$WIKI/*, $ROOT/.claude/rules/active-phase.md]
dispatches: []
tier: complex-orchestration
---

# dev-init

Bootstrap a `.dev-wiki/` directory for a project. Creates the full directory structure, phase articles, living documents (`_CURRENT_STATE.md`, `_ARCHITECTURE.md`, `tasks.md`), index, and log. Run once per project. If the project already has significant history (plan docs, test phases, 20+ commits), enters retrofit mode to import existing phases and detect completed work.

This is a single-agent skill. Claude does all work directly -- no subagent dispatch.

---

## Pre-checks

1. **Dev wiki exists:** Locate project root: `git rev-parse --show-toplevel 2>/dev/null || pwd`
   - If `.dev-wiki/_CURRENT_STATE.md` exists: "Dev wiki already exists. Use `/dev-context` to load project state." STOP.
   - If `.dev-wiki/` exists but `_CURRENT_STATE.md` is missing: ask user "Found incomplete dev wiki. Overwrite and reinitialize?" If no, STOP.

2. **Git availability:** Run `git rev-parse --show-toplevel`.
   - If succeeds: `git_available = true`, record `project_root`.
   - If fails: `git_available = false`, `project_root = pwd`. Warn: "No git repository found. PostCommit hooks will be disabled."

---

## Orchestration Flow

### Step 1-2: Pre-check Results

Performed above. Record `git_available` flag. When false, skip all git-dependent operations.

### Step 3: Gather Project Context

Silently read the following using the Read tool. Do NOT prompt the user. Failures are fine -- skip missing files.

| Source | How to find | Purpose |
|--------|------------|---------|
| README | Use Read tool on `README.md` (or `.rst`, `.txt`) | Project description, goals |
| Manifest | Use Read tool on `pyproject.toml` / `package.json` / `Cargo.toml` / `go.mod` | Dependencies, project name |
| Git history | `git log --oneline -20` (if `git_available`) | Recent work, commit volume |
| File tree | Use Glob tool with patterns like `**/*.py`, `**/*.ts`, `**/*.go` etc. | Codebase shape |
| Knowledge wiki | Use Read tool on `./wiki/schema.md` if it exists | Domain context |
| Plan docs | Use Glob tool: `**/plans/**` and `**/docs/*plan*` | Existing plans for retrofit |

### Step 4: Detect Retrofit vs Greenfield

| Signal | Source | Weight |
|--------|--------|--------|
| Plan documents found | Step 3 plan doc search | strong |
| Test dirs suggest phases | Use Glob tool: `tests/phase*/**`, `tests/step*/**` | strong |
| 20+ commits | `git rev-list --count HEAD` (if `git_available`) | moderate |

**Retrofit mode:** Any strong signal, OR moderate signal present.
**Greenfield mode:** None detected.

### Step 5: Create Directory Structure

```bash
ROOT="<project_root>"
mkdir -p "$ROOT/.dev-wiki/articles/phases" "$ROOT/.dev-wiki/articles/decisions" "$ROOT/.dev-wiki/articles/journal" "$ROOT/.dev-wiki/articles/status" "$ROOT/.dev-wiki/articles/modules" "$ROOT/.dev-wiki/articles/files"
```

The canonical `.dev-wiki/` directory layout is: `articles/{phases,decisions,journal,status,modules,files}/`, plus `AGENTS.md`, `_CURRENT_STATE.md`, `_ARCHITECTURE.md`, `tasks.md`, `schema.md`, `config.md`, `index.md`, `log.md`.

### Step 6: Create schema.md

Read `~/.claude/skills/dev-init/init-scaffolding.md` for the schema.md template. Infer domain and description from Step 3 context. Write `.dev-wiki/schema.md` using the template.

### Step 6.5: Create config.md

Write `.dev-wiki/config.md` with ceremony configuration. Default to `standard` for complex/meta-tooling projects. For small app projects, suggest `lite`. Ceremony levels: **lite** (default — streamlined, no subagent reviewers) and **standard** (full review gates for complex work).

```markdown
ceremony: standard
```

### Step 7: Create Phase Articles -- INTERACTIVE

This is the only interactive step. Present proposed phases for user confirmation. Carry the `mode` flag (greenfield|retrofit) from Step 4 into this step.

Read `~/.claude/skills/dev-init/init-scaffolding.md` for the phase article template. For slugification, see `~/.claude/skills/dev-wiki/slugification.md`.

#### Greenfield mode

1. Analyze project context from Step 3.
2. Propose 2-4 phases with logical progression.
3. Present phases with scope and exit criteria. Ask user to edit, remove, add, or confirm.
4. Wait for user confirmation. At least 1 phase required.
5. First phase gets `status: active`. Others get `status: not-started`.

#### Retrofit mode

1. Import phases from plan docs found in Step 3.
2. If no plan docs but test directories suggest phases, infer from directory names.
3. Auto-detect completed phases using test dirs + source files + git timestamps.
4. Present with detected status. Wait for confirmation.

#### Writing phase files

For each confirmed phase, write `articles/phases/phase-NN-<slug>.md` using the template from the reference file. Read `init-scaffolding.md` for the `active-phase.md` format template. Write `.claude/rules/active-phase.md` (ensure dir exists with `mkdir -p "$ROOT/.claude/rules"`).

### Step 8: Create _ARCHITECTURE.md

Scan the codebase using the Glob tool with appropriate patterns for the project's language. Filter out noise directories (listed in reference). See `~/.claude/skills/dev-wiki/architecture-template.md` for the template and `~/.claude/skills/dev-wiki/size-budgets.md` for size budgets.

### Step 9: Create _CURRENT_STATE.md

Populate from phase articles (Step 7), file scan (Step 3), and git status. See `~/.claude/skills/dev-init/init-scaffolding.md` for the 7-section template and `~/.claude/skills/dev-wiki/size-budgets.md` for size budgets.

For init, set progress to ~0%, decisions to "none yet", blockers to "none yet", session journal to "no sessions yet".

### Step 10: Create tasks.md

Extract tasks from phase exit criteria and body content. Group by phase with phase slug in HTML comment.

```markdown
# Tasks

> Last updated: YYYY-MM-DDTHH:MM:SS by /dev-init

(Use a REAL ISO timestamp from `date -u +%Y-%m-%dT%H:%M:%S`, NOT the literal placeholder.)

<!-- phase:phase-01-slug -->
## Phase 1: Name

- [ ] <task from exit criteria>
- [ ] <task from exit criteria>
```

For retrofit mode with completed phases, mark tasks `[x]` and collapse into `<details>` blocks if needed. See `~/.claude/skills/dev-wiki/size-budgets.md` for size budgets.

### Step 11: Create index.md

List all created articles organized by category and hierarchy with `[[slug|title]]` wikilinks. Include By Category, By Hierarchy, and Recent sections.

### Step 12: Create log.md

```markdown
# Dev Wiki Log

[<ISO-timestamp>] INIT -- dev wiki bootstrapped, N phase articles, git: yes|no
```

### Step 12.5: Create AGENTS.md

Copy the AGENTS.md template from `~/.claude/skills/dev-init/templates/AGENTS.md` to `$ROOT/.dev-wiki/AGENTS.md`. This is the portable session-start protocol that any agent can read to auto-load project state.

### Step 13: Detect Existing Source Code and Offer Scan

After scaffolding, check if the project has existing source code:

1. Glob for source files: `src/**/*`, `app/**/*`, `lib/**/*`, `*.py`, `*.ts`, `*.js`, `*.go`, `*.java`, `*.rb`, `*.rs`
2. Also check: `~/.claude/skills/**/SKILL.md` (skill project), `wiki/articles/**/*.md` (wiki project)
3. Count files found (excluding noise dirs: node_modules, .git, dist, build, __pycache__)

**If source files found (>5 files):**

Check if `/dev-scan` skill is available (`ls ~/.claude/skills/dev-scan/SKILL.md 2>/dev/null`). If not available, skip and note: "Run `/dev-scan` manually later when the skill is installed."

If available, offer:

```
Existing source code detected (<N> files).
Run /dev-scan to create code intelligence articles (module + file articles with dependency tracking)?
This enables agents to understand code structure before making changes. [Y/n]
```

If user confirms: invoke `/dev-scan` (which will run a full scan since no articles exist yet).
If user declines: skip. They can run `/dev-scan` manually later.

**If few or no source files (<= 5):** Skip silently. Empty/tiny projects don't need scanning.

### Step 13b: Offer Project CLAUDE.md Scaffolding

If `./CLAUDE.md` does not exist, ask: "Scaffold project `CLAUDE.md` from template? (y/n)". If yes, read `~/.claude/skills/dev-init/scaffold-claude-md.md` and follow its instructions (self-describing companion per Phase 17 pattern).

### Step 14: Report to User

```
Dev wiki initialized at .dev-wiki/

- Mode: greenfield | retrofit
- Phases: N (M completed, K active, J not-started)
- Architecture snapshot captured
- Tasks extracted: T items across N phases
- Git: available | not available
- Code articles: <created by scan | scan skipped | no source code>

Next steps:
- Run /dev-plan to create your first phase and tasks
- Run /dev-context at the start of future sessions to load project state
- Run /dev-debrief before ending sessions to capture decisions and progress
- Run /dev-scan anytime for deep code analysis with dependency mapping

Also creates `.claude/rules/active-phase.md` as a compaction-proof phase context anchor.
```

---

## Error Handling

| Error | Response |
|-------|----------|
| Cannot create `.dev-wiki/` directory | "Failed to create .dev-wiki/. Check permissions." STOP. |
| No README, no manifest, empty project | Proceed with minimal context. Warn: "Sparse project context -- phases are rough estimates." |
| User rejects all phases | "At least 1 phase is required." Do not proceed without one. |
| File write fails mid-init | Report which files succeeded and failed. User can re-run `/dev-init`. |
| Plan docs found but unparseable | Fall back to inferring phases from code. Warn: "Could not parse plan documents." |

For data flow conventions, see `~/.claude/skills/dev-wiki/architecture-template.md`. For CLAUDE.md lifecycle, see `~/.claude/skills/dev-wiki/claude-md-lifecycle.md`.
