# Slugification Algorithm

Shared reference for all dev-wiki skills that generate filenames.

Used for all generated filenames (phase articles, decision articles, journal entries).

1. Strip conventional-commit prefix (`feat:`, `fix:`, `refactor:`, etc.) if present
2. Lowercase
3. Replace spaces and underscores with hyphens
4. Remove all characters except `[a-z0-9-]`
5. Collapse multiple hyphens to single
6. Strip leading/trailing hyphens
7. Truncate to 50 characters (at word boundary if possible)

**Filename patterns:**
- Phase files: `phase-NN-<slug>.md` (zero-pad to two digits)
- Decision files: `<slug>.md` (append `-2`, `-3` if exists)
- Journal files: `YYYY-MM-DD-<slug>.md` (append `-2`, `-3` if exists)
- Status files: `YYYY-MM-DD-codebase-snapshot.md`
- File articles: `articles/files/<path-slug>.md`
- Module articles: `articles/modules/<module-slug>.md`

**Path-to-slug algorithm (for code articles):**

All paths are relative to `$ROOT` (the directory containing `.dev-wiki/`). The output is called a **path-slug** for both file and module articles.

_File path-slugs:_
1. Start from project-relative path (e.g., `src/auth/middleware.ts`)
2. Remove the file extension (last `.ext` segment only)
3. Replace `/` and `.` with `-`
4. Apply standard slug rules (steps 2-7 above), but truncate to **64 characters** (not 50 — paths need more room)

_Module path-slugs:_
1. Start from project-relative directory path (e.g., `src/auth/`)
2. Strip trailing `/`
3. Replace `/` with `-`
4. Apply standard slug rules (64-char truncation)

**Worked examples:**

| Source Path | Type | Path-Slug |
|-------------|------|-----------|
| `src/auth/middleware.ts` | file | `src-auth-middleware` |
| `src/auth/jwt-verify.ts` | file | `src-auth-jwt-verify` |
| `src/config/db.config.ts` | file | `src-config-db-config` |
| `lib/utils/string_helpers.rb` | file | `lib-utils-string-helpers` |
| `.eslintrc.js` | file | `eslintrc` |
| `src/auth/` | module | `src-auth` |
| `tests/unit/` | module | `tests-unit` |

**Collision handling:** If two paths produce the same path-slug (e.g., `src/a-b/c.ts` and `src/a/b-c.ts` both → `src-a-b-c`), append `-2`, `-3` to the later-created article. Dotfiles may also collide with same-named extensioned files (e.g., `.env` and `env.ts` both → `env`). In practice, collisions are rare.

### Recognized Extensions (for drift checks)

The authoritative list of file extensions stripped by step 2 of the file path-to-slug algorithm is `{md, sh, ts, py, json, yaml}`. /dev-scan's Step 6a slug-drift regression check enumerates the same set.

**Extension-expansion protocol:** when a new extension enters /dev-scan scope, edit this list AND update the /dev-scan Step 6a regex in lockstep; failure to edit both produces the exact silent-false-PASS class the enumeration exists to prevent.
