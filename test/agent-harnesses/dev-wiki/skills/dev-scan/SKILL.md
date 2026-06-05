---
name: dev-scan
description: "Use when adopting dev-wiki on an existing project, when _ARCHITECTURE.md is shallow, or after major structural changes. Scans code structure, modules, dependencies, entry points, and design patterns. Do NOT use for ad-hoc code questions — use Grep/Read directly."
reads: [$WIKI/_ARCHITECTURE.md, $WIKI/schema.md]
writes: [$WIKI/_ARCHITECTURE.md, $WIKI/_CURRENT_STATE.md(Key Artifacts), $WIKI/articles/modules/*, $WIKI/articles/files/*, $WIKI/articles/status/*, $WIKI/index.md]
dispatches: [architecture, module, file, python-scan-profile (conditional), python-memory-checks (conditional)]
tier: complex-orchestration
---

# dev-scan

Deep codebase analysis producing structural knowledge for the dev-wiki. Systematic outside-in scan (Glob -> Grep -> Read), then subagent synthesis into `_ARCHITECTURE.md` and per-module articles.

**Hybrid execution:** Main agent scans (full tool access), subagents synthesize articles from companion prompt templates.

---

## Pre-checks

1. **Resolve project root.** `git rev-parse --show-toplevel 2>/dev/null || pwd`. Store as root path. All "wiki path" references mean `<root>/.dev-wiki` — substitute actual paths in subagent prompts, NEVER pass `$ROOT` as literal.
2. **Dev wiki must exist.** Check `<root>/.dev-wiki/_CURRENT_STATE.md`. If missing: "No dev wiki found. Run `/dev-init` first." STOP.
3. **Read current architecture.** Read `<root>/.dev-wiki/_ARCHITECTURE.md`. Note gaps.
4. **Top-level scan.** Glob `<root>/*` to map project structure.

---

## Auto-Detect Mode Selection

After pre-checks, before Step 1, determine scan mode:

1. Glob `<wiki_path>/articles/files/*.md` and `<wiki_path>/articles/modules/*.md`
2. Check for `--full` flag in user invocation

| Existing articles? | `--full` flag? | Mode |
|---------------------|----------------|------|
| None found | N/A | **Full scan** — run Steps 1-7 below |
| Found | No | **Incremental refresh** — read `refresh-flow.md` |
| Found | Yes | **Full scan** — delete existing articles first, then Steps 1-7 |

### Refresh Flow (incremental, hash-based)

Read `refresh-flow.md` and follow the incremental refresh protocol.

---

## Scan Flow (Main Agent — Steps 1-4)

Use Glob, Grep, Read tools. Do NOT use Bash for file discovery except for hash computation (`shasum`). Budget: max 30 file reads, max 150 lines each.

**Content hashing:** For every source file Read during Steps 2-3, compute its SHA-256 hash using Bash: `shasum -a 256 <file> | cut -c1-16`. Store results in a hash lookup table: `{project-relative-path: 16-char-hash}`. This table is passed to Subagents B and C in Step 6 for article frontmatter. See `~/.claude/skills/dev-scan/content-hashing.md` for the full spec. Skip files matching its exclusion patterns (binary, generated, node_modules, etc.).

**Compaction survival:** Write scan progress to TodoWrite (Steps 1-7, all `pending`). Update as you work.

**Budget priority:** If 30-file cap hit before Step 4, skip pattern detection. Priority: entry points > module main files > pattern evidence > config files.

### Step 1: Project Shape + Dependencies

1. Read manifest files (package.json, pyproject.toml, etc.) for identity + dependencies
2. Glob source dirs: `src/**/*`, `app/**/*`, `lib/**/*`, `cmd/**/*`, `internal/**/*`
3. Count files per extension -> primary language
4. Glob config: `.env*`, `config.*`, `settings.*`, `*.yaml`, `*.toml`
5. Detect development toolchain (see table below)

**Toolchain detection** — Glob/Grep for config files by primary language:

| Language | Testing | Type Check | Lint/Format | Venv/Deps | Build |
|----------|---------|------------|-------------|-----------|-------|
| Python | `pytest.ini`, `conftest.py`, `pyproject.toml [tool.pytest]`, `tox.ini` | `mypy.ini`, `pyrightconfig.json`, `pyproject.toml [tool.mypy]` | `ruff.toml`, `.flake8`, `.pylintrc`, `pyproject.toml [tool.ruff\|black]` | `.venv/`, `venv/`, `Pipfile`, `poetry.lock`, `requirements*.txt`, `uv.lock` | `pyproject.toml [build-system]`, `setup.py`, `Makefile` |
| TS/JS | `jest.config.*`, `vitest.config.*`, `cypress.config.*` | `tsconfig.json` | `eslint.config.*`, `.prettierrc*`, `biome.json` | — | — |
| Go | `*_test.go` presence | — | `.golangci.yml` | — | — |
| Java | `pom.xml`/`build.gradle` test deps | — | — | — | `pom.xml`, `build.gradle*` |

For each detected tool: record name, config path, key settings (strict mode, coverage thresholds). Parse `pyproject.toml [tool.*]` sections (max 20 lines each). For venv: check directory existence only, do NOT activate or run pip.

**Non-standard fallback:** No standard source dirs or manifest? Try: skill/wiki project (`~/.claude/skills/**/SKILL.md`, `wiki/articles/**`), doc project (`docs/**`), monorepo (`packages/*/`, `services/*/`). Do NOT STOP on "no source files."

**Python language profile:** If primary language is Python, read `python-scan-profile.md` from this skill's directory. Follow its check categories during Steps 1-4. If database/analytics deps detected (duckdb, polars, pyarrow, kuzu, pandas, numpy — check `pyproject.toml`, `requirements*.txt`, `Pipfile`, `environment.yml`), also read `python-memory-checks.md`. Format combined findings as `<PYTHON_CONTEXT>` for Subagent A.

**Output:** Language, file count, dependency list, config locations, toolchain findings.

### Step 2: Entry Point Discovery

Grep for language-specific entry points:

| Language | Patterns |
|----------|----------|
| Python | `if __name__`, `app = Flask`, `app = FastAPI`, `urlpatterns` |
| TS/JS | `export default`, `createServer`, `app.listen`, `handler` |
| Go | `func main\(`, `func init\(`, `http.HandleFunc` |
| Java | `public static void main`, `@SpringBootApplication` |

Read each (max 10, first 100 lines). Map to parent module. Hash each file read (add to hash lookup).

**Output:** Entry point files, modules, initialization, hashes.

### Step 3: Module Discovery + Dependency Mapping

For each top-level source directory (max 8, largest first by file count):

1. Glob files in directory
2. Find "main" file (index.*, mod.*, __init__.*, or largest)
3. Read main file (first 150 lines) -> extract purpose
4. Grep internal imports -> build import graph
5. Detect exports: Python (`def`/`class` at module level), TS (`export function/class/const`), Go (capitalized `func`)
6. Note: file count, test files present?

**Output per module:** Name, purpose, key files, public API, dependencies, test coverage, per-file hashes.

**Batch hash remaining files:** After Step 3 module reads, hash all source files not yet hashed using a single Bash call with `find` and `shasum -a 256`. Construct exclusion flags from the FULL exclusion list in `~/.claude/skills/dev-scan/content-hashing.md` (node_modules, .git, dist, build, __pycache__, .venv, venv, .tox, *.egg-info, .mypy_cache, .pytest_cache, plus binary extensions). Parse output into the hash lookup table. This ensures ALL source files are hashed, not just those Read during scanning.

### Step 3b: Cross-File Dependency Mapping

Grep ALL internal imports (exclude .venv, node_modules, dist, build):

| Language | Pattern |
|----------|---------|
| Python | `^from <pkg>\.\|^import <pkg>\.` |
| TS/JS | `from ['"]\.` or `require\(['"]\.` |
| Go | Internal import paths (module prefix) |

Extract specific symbols imported. Build tiered dependency map:

- **Tier 1 (Hub, 10+ importers):** file, count, top symbols
- **Tier 2 (Shared, 5-9 importers):** file, count
- **Tier 3 (Internal, 2-4 importers):** file, importers
- **Cross-package edges:** bidirectional coupling pairs

Grep hub module symbols for per-symbol importer lists.

### Step 4: Design Pattern + Issue Detection

Grep for patterns (database, API routes, auth, config, logging, tests, CI/CD). Read 1-2 files per pattern (max 10 total).

**Issue detection (Grep-based):**

| Check | Severity |
|-------|----------|
| Duplicated function signatures in 3+ files | MEDIUM |
| Inconsistent sibling patterns (one module skips a pattern siblings use) | HIGH |
| Dead dependencies (in manifest, zero source imports) | LOW |
| Non-deterministic calls without seeding | MEDIUM |
| Missing boundary validation on public modules | LOW |

**Toolchain issue detection** (from Step 1 toolchain findings):

| Check | Severity |
|-------|----------|
| No test framework detected for project with source files | HIGH |
| Test config exists but no test files found | MEDIUM |
| No type checker configured (Python/TS projects) | MEDIUM |
| No linter configured | LOW |
| Venv directory absent but dependency manifest exists (Python) | MEDIUM |
| Multiple conflicting dependency managers (e.g., both poetry.lock and Pipfile) | LOW |

**Wiki cross-reference:** If `<root>/wiki/` exists, read decisions and pattern articles (max 5). Flag code that violates documented decisions or skips documented patterns.

**Output:** Detected patterns with evidence, issues by severity, toolchain issues.

---

## Step 5: Present Findings for Approval

```
Codebase Scan Results:

Language: <primary> (<file count> files)
Modules: <count>
  - <name>: <purpose> (<files>)

Entry Points: <count>
Hub Modules: <list with importer counts>
Cross-Package Coupling: <list or "none">
Toolchain: <test framework>, <type checker>, <linter> | venv: <strategy> | build: <system>
Issues: <H> HIGH, <M> MEDIUM, <L> LOW

Proposed: <N> module articles + <M> file articles + _ARCHITECTURE.md

Approve? (or add context / exclude modules)
```

<HARD-GATE>
Do NOT write articles until user approves.
</HARD-GATE>

---

## Step 6: Dispatch Synthesis Subagents (via Agent tool)

After approval, dispatch subagents in parallel. Substitute resolved paths into all prompts — NEVER pass `$ROOT` or `$WIKI` as literal strings.

**Subagent A: Rewrite _ARCHITECTURE.md**

Read `~/.claude/skills/dev-scan/architecture-prompt.md` for the prompt template. Replace `<WIKI_PATH>` with resolved wiki path, `<SCAN_FINDINGS>` with complete scan findings from Steps 1-4 formatted as the markdown sections produced during scanning (Project Shape, Entry Points, Module Discovery, Dependency Map, Patterns, Issues), `<TODAY>` with current date.

**Subagent B: Create module articles**

Read `~/.claude/skills/dev-scan/module-prompt.md` for the prompt template. Replace `<WIKI_PATH>`, `<MODULE_FINDINGS>` (one section per module from Step 3), `<HASH_LOOKUP>` (hash table from scan), `<TODAY>`.

**Subagent C (batched): Create file articles**

Read `~/.claude/skills/dev-scan/file-prompt.md` for the prompt template. Split source files into batches of ~20. For each batch, dispatch a subagent with `<FILE_BATCH>` containing per-file scan data (exports, imports, imported_by, purpose from comments), `<HASH_LOOKUP>`, `<WIKI_PATH>`, `<TODAY>`. Dispatch batches in parallel.

**Batching rules:**
- Group files by parent module (files in same module go to same batch). If a module exceeds 20 files, split into multiple batches (prefer slightly over-filling to 25 over a tiny remnant batch).
- Max ~20 files per batch, max 5 batches (100 files total per scan)
- For projects >100 source files, prioritize: hub module files > entry points > remaining by import count descending
- Skip barrel files (<5 lines, re-export only) — document in module article instead

### Step 6a: Verify Subagent Output

1. Read `<wiki_path>/_ARCHITECTURE.md` — verify written and >50 lines
2. Glob `<wiki_path>/articles/modules/*.md` — verify count matches dispatched modules
3. Glob `<wiki_path>/articles/files/*.md` — verify count matches dispatched files (minus skipped barrels)
4. If any subagent failed: report which, apply successful outputs, write missing artifacts directly as fallback
5. **Slug-drift HARD check** (extensions per `~/.claude/skills/dev-wiki/slugification.md` §Recognized Extensions; HARD = unambiguous, fail-loud): `ls <wiki_path>/articles/files/ | grep -E '-(sh|ts|py|json|yaml)\.md$'` MUST return empty. Fail-loud: `"Slug-drift detected (non-md extension suffix)."`
6. **Slug-drift WARN check:** `ls <wiki_path>/articles/files/ | grep -E '-md\.md$'` — list matches for human review (known false-positive class: legit basenames ending in "md" like `scaffold-claude-md.md`; verify against source path). See [[phase-19e-subagent-template-hardening-scope]] and [[full-scan-over-refresh]] for the failure-mode family (criteria that always pass mask real failures).

---

## Step 7: Post-Write

1. **Update _CURRENT_STATE.md** — refresh `## Key Artifacts` with discovered modules ranked by importer count
2. **Update index.md** — add new articles to appropriate category sections
3. **Append to log.md:** `[<ISO-timestamp>] SCAN -- N modules, M file articles, K issues (H high, M medium, L low)`
4. **Report to user:** summary of created artifacts (module count, file count, hub modules, coupling edges, issues)

---

## Error Handling

| Error | Response |
|-------|----------|
| No `.dev-wiki/` | "Run `/dev-init` first." STOP. |
| No source files | Activate non-standard fallback (Step 1). Do NOT STOP. |
| Budget exceeded (30 files) | "Scanned 30 files (cap). Results may be incomplete." |
| Subagent failure | Report which, apply successful output, write missing artifact directly. |
| `--full` with no prior articles | Treat as normal full scan (no-op deletion step). |

## Scope Boundary

Writes ONLY to `.dev-wiki/`. NEVER modifies source code, tests, config, or files outside `.dev-wiki/`.
