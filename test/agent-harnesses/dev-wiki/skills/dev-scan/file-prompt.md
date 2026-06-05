# File Article Synthesis Prompt

Subagent prompt template for creating per-file code articles. This file is the canonical template source. Read by dev-scan SKILL.md Step 6, Subagent C. Dispatched in batches of ~20 files per subagent.

## Prompt

Create one file article per source file in `<WIKI_PATH>/articles/files/` (directory will be created on first Write).

The canonical template is defined in this file — see the Per-File Article section below. Path-slugs use 64-character truncation per `~/.claude/skills/dev-wiki/slugification.md`.

### Slug Normalization

Strip any file extension (see `~/.claude/skills/dev-wiki/slugification.md` §Recognized Extensions) BEFORE applying the path-to-slug rules from that file. The slug must NOT contain the source extension as a suffix. Retaining it is a silent-false-pass instance (slug-extension-drift) — a criterion that always passes, masking real failures.

Worked example: `~/.claude/hooks/session-start.sh` → `claude-hooks-session-start` (correct) — NOT `claude-hooks-session-start-sh` (incorrect: retains extension).

Parallel subagents share this convention; verify your slugs against the worked example before emission.

### File Batch

<FILE_BATCH>

### Hash Lookup

<HASH_LOOKUP>

### Per-File Article

For each file in the batch, create: `<WIKI_PATH>/articles/files/<path-slug>.md`

The `<path-slug>` is derived from the file path using the path-to-slug rules in `~/.claude/skills/dev-wiki/slugification.md` (e.g., `src/auth/middleware.ts` -> `src-auth-middleware`).

Frontmatter:

```yaml
---
title: "<project-relative-path>"
aliases: []
category: files
tags: [<language>, <framework-if-detected>]
parents: [<module-path-slug>]
created: <TODAY>
updated: <TODAY>
source: scan
type: file
path: "<project-relative-path>"
content_hash: "<16-char hash from lookup>"
exports: [<bare symbol names>]
imports: ["<project-relative-path>", ...]
imported_by: ["<project-relative-path>", ...]
data_reads: []
data_writes: []
# generated: true    (add only for build output files; skips staleness checks per `~/.claude/skills/dev-scan/content-hashing.md`)
---
```

Begin the article body with `# <project-relative-path>` (H1 heading) followed by a 1-2 sentence purpose description (no heading for purpose — it is the introductory paragraph). Then write these sections:

- **## Exports** — `<symbol>(params)` with brief descriptions. Cap at 10 most-used symbols if over.
- **## Dependencies** — Internal: `[[<path-slug>|<filename>]] -- \`<imported-symbol>\` <usage>`. External: `` `<package>` (external) -- <usage> ``.
- **## Dependents** — `[[<path-slug>|<filename>]]` wiki-links showing what imports from this file.
- **## Key Logic** — Important algorithms, business logic, error handling. Summarize in 1-2 sentences per item. Omit section entirely for purely declarative files (types, config, constants, barrel exports).

### Data I/O Extraction

Populate `data_reads:` and `data_writes:` frontmatter fields by scanning each source file for data dependencies beyond code imports. These fields are OPTIONAL — leave as empty `[]` when no data dependencies are detectable.

**Detection heuristics** (scan for these patterns in the source):
- **File I/O:** open/read/write calls, path references to config files, data files, output artifacts
- **Environment variables:** `$VAR`, `os.environ`, `process.env`, `std::env`, `os.Getenv`
- **Database connections:** connection strings, query builders, ORM model references
- **HTTP clients:** API endpoint URLs, fetch/axios/requests calls, webhook targets
- **Cache/queue:** Redis, memcached, message queue producers/consumers

Format entries as descriptive strings: `"config.json (read)"`, `"$DATABASE_URL env"`, `"output.csv (write)"`, `"POST /api/webhook"`. Group by read vs write.

For declarative files (Markdown, YAML config, type definitions) with no runtime data I/O, leave both fields as `[]`.

### Constraints

- `exports` frontmatter: bare names ONLY (e.g., `[validateToken, refreshToken]`). Signatures go in body.
- `imports`/`imported_by` frontmatter: project-relative paths, NOT source-relative.
- If a dependency target has no file article (excluded per `~/.claude/skills/dev-scan/content-hashing.md` exclusion patterns), render as plain `` `<path>` `` not wiki-link.
- Files under 5 lines that are purely re-exports (barrel files): skip, document in parent module article instead.
- Do NOT include function/method bodies in Key Logic — summarize the algorithm only.
- Do NOT create articles for files matching the exclusion patterns in `~/.claude/skills/dev-scan/content-hashing.md`.
- Do NOT scan the codebase to populate `imported_by` — use only the data provided in `<FILE_BATCH>`.
- Do NOT use `## Purpose` as a heading — the purpose is the introductory paragraph after the H1.
- Do NOT include import statements verbatim — summarize what is imported and why.
- Max 80 lines per article (see `~/.claude/skills/dev-wiki/size-budgets.md`)
- Do NOT create files outside `<WIKI_PATH>/articles/files/`
- Do NOT modify source code
