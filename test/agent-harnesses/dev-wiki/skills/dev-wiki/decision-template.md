# decision-template.md

Template for decision articles stored in `.dev-wiki/articles/decisions/`. Consumed by `dev-debrief` (extraction) and `dev-plan` (reading recent decisions).

## Decision Article Template

### Frontmatter

```yaml
---
title: "<Decision Title>"
aliases: [<alias1>, <alias2>]
category: decisions
tags: [<relevant-tags>]
parents: [<parent-phase-slug>]
created: YYYY-MM-DD
updated: YYYY-MM-DD
source: debrief | plan
confidence: high | medium | low
---
```

### Body (3 required sections)

```markdown
## Context

<Why this decision was needed. What problem or trade-off prompted it.>

## Decision

<What was chosen and why. Reference alternatives considered.>

## Consequences

<What follows from this decision. Trade-offs accepted. Future implications.>
```

### Decision Extraction Criteria

**Include if ALL true:** 2+ alternatives discussed, one chosen with rationale, affects architecture/tooling/data/workflow, user confirmed.
**Exclude if ANY true:** mechanical implementation detail, temporary spike, style preference (unless project-wide), unresolved question, already captured (dedup by title/aliases).

**Signal words:** "let's go with", "decided to", "chose X over Y", "agreed on", "settled on"

**Confidence:** `high` = explicit confirmation + reasoning. `medium` = implicit agreement. `low` = user said "ok" without engaging (only for data model/architecture).

**Noise prevention:** Dedup against existing. Min 2 messages of discussion. Max 5 per session.
