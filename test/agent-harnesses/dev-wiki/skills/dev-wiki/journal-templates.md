# journal-templates.md

All three journal entry templates (Rich, Mechanical, Quick) plus common frontmatter. Consumed by `dev-debrief` and `dev-context`.

## Journal Entry Templates

### Rich Journal (from /dev-debrief full mode)

Body structure (target 20-40 lines, hard cap 60):

```markdown
# <Session Title>

## What Happened
- <Rich description of work done -- includes discussion, dead ends, exploration>
- <Include context that git log alone would not capture>

## Decisions Made
- [[<decision-slug>|<Decision Title>]] -- extracted this session

## Problems Solved
- <Problem description> -- <How it was resolved>

## Open Questions
- <Question with enough context to understand later>

## Artifacts Changed
- `<file-path>` (<brief description of change>)

## Related
- [[<phase-slug>|<Phase Title>]] -- parent phase

## Soft Observations / Phase N+1 Candidates  <!-- OPTIONAL -->
- <observation> | <suggested phase-N+1 framing> | <evidence link: status article or journal section>
```

Omit empty sections (except "What Happened" and "Artifacts Changed" are always required). The `## Soft Observations / Phase N+1 Candidates` section is **OPTIONAL** — populate when the session produced a validation-status article OR surfaced uncovered patterns. Existing journals without this section remain valid (it is purely additive). Downstream phases use this section as their refinement-phase candidate source.

### Mechanical Journal (from /dev-context breadcrumb processing)

Body (20-40 lines, factual only): `## What Happened` (one bullet per commit), `## Artifacts Changed` (files list), `## Related` (phase link). Omit Decisions, Problems, Open Questions — those require conversation analysis.

### Quick Journal (from /dev-debrief quick mode)

Body (exactly 3 lines): `# <summary>` then 3 bullets: what was done, key outcome, next step.

### Common Frontmatter (all journal types)

```yaml
---
title: "<Session or summary title>"
aliases: []
category: journal
tags: [<infer from work done>]
parents: [<active-phase-slug>]
created: YYYY-MM-DD
updated: YYYY-MM-DD
source: debrief | debrief-quick | hook | adjust
---
```
