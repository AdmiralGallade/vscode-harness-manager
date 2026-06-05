# Init Scaffolding — Templates

Companion file for dev-init SKILL.md. Contains stable template content for schema.md and active-phase.md. Read by SKILL.md at Steps 6 and 7.

---

## schema.md Template

```markdown
# Dev Wiki Schema

## Project Identity

- **domain:** <inferred domain>
- **name:** <project name from manifest or directory name>
- **description:** <1-2 sentence project description>

## Article Categories

| Category | Directory | Purpose |
|----------|-----------|---------|
| phases | articles/phases/ | Strategic milestone definitions |
| decisions | articles/decisions/ | Architectural Decision Records |
| journal | articles/journal/ | Session journal entries (1 per session) |
| status | articles/status/ | Legacy codebase snapshots (read-only, see Section N) |
| modules | articles/modules/ | Per-directory code intelligence articles (Section P) |
| files | articles/files/ | Per-file code intelligence articles (Section O) |

## Conventions

- Phase filenames: `phase-NN-<slug>.md`
- Decision filenames: `<slug>.md`
- Journal filenames: `YYYY-MM-DD-<slug>.md`
- Wikilinks: `[[slug|Display Text]]`
```

## active-phase.md Template

```markdown
# Active Phase Context

Phase: N - <Name>
Objective: <from active phase article>
Scope: <from scope globs>
Key constraints: <from project context or "none yet">
Exit criteria:
- <from phase article>
Abort: if blocked >3 attempts on any task, run /dev adjust
```
