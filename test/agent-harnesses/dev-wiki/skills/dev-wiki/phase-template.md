# phase-template.md

Template for phase articles stored in `.dev-wiki/articles/phases/`. Consumed by `dev-plan` (create) and `dev-debrief` (status updates).

## Phase Article Template

### Frontmatter

```yaml
---
title: "Phase N: Name"
aliases: []
category: phases
tags: []
parents: []
created: YYYY-MM-DD
updated: YYYY-MM-DD
source: init | plan
status: not-started | active | completed
scope: ["path/globs/*"]
entry_criteria: "..."
exit_criteria: "..."
---
```

### Body

```markdown
# Phase N: Name

## Objective

<1-2 sentences describing what this phase accomplishes>

## Scope

Files and modules affected:
- `path/to/module/*`

## Exit Criteria

- [ ] <criterion 1>
- [ ] <criterion 2>

## Notes

<Any relevant context from project analysis>
```
