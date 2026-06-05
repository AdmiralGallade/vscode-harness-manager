# Stale Queue Specification

Lightweight change-tracking mechanism. PostToolUse hooks mark changed files; `/dev-context` processes the queue at session start.

## File Format

**Location:** `.dev-wiki/.stale-queue`
**Format:** One project-relative file path per line. No blank lines. Best-effort dedup on write; read-side dedup before processing.

```
src/auth/middleware.ts
src/config/db.ts
lib/utils/helpers.ts
```

**Hard cap:** 200 entries. If the queue exceeds 200, new entries are dropped with a warning in the hook output. **Soft warning** at 100 entries: `/dev-context` emits "Stale queue has N entries. Consider `/dev-scan --refresh`."

## Write Protocol (PostToolUse hook on Edit/Write)

1. Extract target file path from tool result
2. Convert to project-relative path
3. **Skip** if path matches exclusion patterns: `~/.claude/skills/dev-scan/content-hashing.md` exclusions + `.dev-wiki/**` + all `*.md` files
4. **Skip** if path already present in `.stale-queue` (best-effort dedup via grep; duplicates are harmless)
5. **Skip** if queue has >= 200 entries (hard cap)
6. Append path to `.stale-queue`

Hook fires only on `Edit` and `Write` tool calls. Does NOT fire on `Read`, `Glob`, `Grep`, or `Bash`.

**Known gap — renames:** File renames via `Bash` (e.g., `mv`, `git mv`) do NOT trigger the hook. Old file articles persist with stale paths. Run `/dev-scan --refresh` after renaming files outside agent sessions. New files created outside agent sessions (e.g., `git pull`) are similarly not captured.

## Read Protocol (dev-context at session start)

1. If `.stale-queue` does not exist or is empty: skip
2. Read all paths, **deduplicate**, validate each line matches `[a-zA-Z0-9_./-]+` (discard invalid lines with warning)
3. Process first **10 entries** (FIFO order — oldest changes first; cap prevents slow startup)
4. For each path:
   - If file exists: recompute hash, compare to article. If stale: update `content_hash` in frontmatter. Only regenerate full article content if exports/imports changed (detected by diff).
   - If file deleted: remove file article, update parent module article
   - If processing fails (hash error, analysis failure): keep entry in queue for next session
5. For each affected module: recompute composite hash, update module article if changed
6. Remove only **successfully processed** entries from `.stale-queue`
7. If entries remain (>10 cap or failed), keep for next session

**In-session staleness:** Queue entries written during a session are NOT processed until the next session's `/dev-context`. Within a session, articles for recently-edited files may be stale. Run `/dev-scan --refresh` mid-session if immediate consistency is needed.

## Lifecycle

```
Edit/Write tool call
  → PostToolUse hook appends to .stale-queue (if source file, within caps)
  → [session continues, more edits may add more entries]

Next session start (/dev-context)
  → Reads .stale-queue, dedup, validate
  → Processes first 10 entries (FIFO)
  → Hash-only update for unchanged structure; full regeneration for changed exports/imports
  → Clears processed entries; keeps remaining
```

## Full Refresh (bypasses queue)

`/dev-scan --refresh` ignores `.stale-queue` and hashes ALL source files against ALL articles. Used when:
- Queue exceeds soft warning (100+ entries)
- File renames or deletions happened outside agent sessions
- Major refactoring (many files changed via `git pull`, manual editing, CI)
- First time setup (no articles exist yet)

After full refresh, `.stale-queue` is deleted.
