# Iterative Retrieval Specification

Companion to dev-plan Step 2.5. Defines the multi-round knowledge retrieval loop.

## Loop Protocol

1. **Extract concepts (once).** Parse phase objective and scope into 3-8 key concepts. This set (M) is **frozen** — do not re-extract in later rounds.
2. **Round 0 (initial).** Map each concept to articles retrieved in Step 2. Compute coverage = concepts-with-article / M.
3. **Iterate (max 3 rounds).** While coverage < 70% AND round < 3 AND new articles exist:
   a. For each uncovered concept, search wiki indexes for matching titles/tags NOT already retrieved (dedup against all prior rounds).
   b. Read up to 3 new unique articles per round.
   c. Re-map concepts to the expanded article set. Recompute coverage.
4. **Report.** `"Knowledge coverage: N/M concepts covered (R rounds, A articles total)."` List unfillable gaps.
5. **Pass gaps.** Unfillable gaps (no wiki article exists after all rounds) become Step 4 design questions.

## Exit Conditions (OR-gate)

Exit the loop when ANY of:
- Coverage ≥ 70% of frozen concept set
- 3 expansion rounds completed
- No new unique articles found in the latest round

## Budget

| Round | Articles Read | Cumulative Max |
|-------|--------------|----------------|
| Initial (Step 2) | 5 | 5 |
| Round 1 | up to 3 | 8 |
| Round 2 | up to 3 | 11 |
| Round 3 | up to 3 | 14 |

Total ceiling: 14 articles. Each article costs ~1500 tokens. Worst case: ~21000 tokens.

## Deduplication

Maintain a set of all article slugs read across Step 2 + all rounds. Each round's "up to 3" budget counts only NEW articles not in this set. If a search returns only already-read articles, the "no new articles" exit fires.
