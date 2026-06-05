# content-hashing.md

Content hashing specification for staleness detection in code articles — file hash algorithm, module composite hash, staleness check, edge cases, and exclusion patterns. Consumed by `dev-scan` (article creation/refresh) and `dev-context` (incremental staleness check).

## Content Hashing Specification

Staleness detection for code articles. Each article stores a hash of its source; drift = hash mismatch. `$ROOT` is the directory containing `.dev-wiki/`. All project-relative paths are relative to `$ROOT`.

### File Hash Algorithm

1. Read file content as raw bytes (encoding-agnostic; assumes consistent line endings across checkouts)
2. Compute SHA-256 hash
3. Take first 16 hex characters (64 bits — negligible collision risk for codebases under 10M files)
4. Store in frontmatter `content_hash` field

```bash
# macOS
shasum -a 256 path/to/file | cut -c1-16
# Linux
sha256sum path/to/file | cut -c1-16
```

### Module Composite Hash

1. Collect `content_hash` values from all file articles in the module
2. Sort alphabetically by `path` field
3. Join with `\n` separator (no trailing newline)
4. SHA-256 the joined string, take first 16 hex characters

A module is stale if ANY child file hash changed (composite will differ). If a file article is missing for a known source file, treat as stale (hash mismatch).

### Staleness Check

```
is_stale = (sha256(read_file(path))[:16] != article.content_hash)
```

Performed by `/dev-context` (session-start incremental) and `/dev-scan --refresh` (full).

### Edge Cases

| Case | Rule |
|------|------|
| Binary files (images, compiled) | Skip -- do not create articles |
| Empty files | Hash of empty string (`e3b0c44298fc1c14`) |
| Generated files (build output) | Mark `generated: true` in frontmatter; skip during staleness checks |
| Symlinks | Follow target, hash target content; note `symlink: true`. Skip if target is outside `$ROOT` or creates a cycle. |
| Files outside project root | Skip -- only hash files within `$ROOT` |
| Non-UTF-8 source files | Hash is computed on raw bytes (encoding-agnostic); article content analysis assumes UTF-8 |
| File deleted since last scan | Remove article; update parent module article |
| New file since last scan | Create article; update parent module article |

### Exclusion Patterns (files that NEVER get articles)

```
node_modules/**  .git/**  dist/**  build/**  __pycache__/**
.venv/**  venv/**  .tox/**  *.egg-info/**  .mypy_cache/**  .pytest_cache/**
*.png  *.jpg  *.gif  *.ico  *.woff  *.ttf  *.pdf
*.pyc  *.o  *.so  *.dylib  *.class  *.jar
```

Configurable via `.dev-wiki/scan-config.md` (future, not in R1 scope).
