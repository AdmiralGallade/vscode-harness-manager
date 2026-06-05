# Refresh Flow (Incremental, Hash-Based)

When existing code articles are found and `--full` is NOT set:

1. **Hash all source files** using batch `shasum -a 256` (same as Step 3 batch hash)
2. **Read existing article frontmatter** — extract `path` and `content_hash` from each file article
3. **Compare hashes:**
   - **Stale** (hash mismatch): re-scan file, regenerate article via single file-prompt subagent
   - **New** (file exists, no article): add to scan queue
   - **Deleted** (article exists, file gone): remove article, update parent module article
   - **Unchanged** (hash match): skip
4. **Recompute module composite hashes** for affected modules. Regenerate module articles if composite changed.
5. **Clear `.stale-queue`** — all entries are now addressed by the full hash comparison
6. **Update index.md and log.md** with refresh summary
7. **Report:** "Incremental refresh: N unchanged, M updated, K new, J removed"

**Budget:** Refresh caps at 50 file regenerations per invocation. If >50 stale/new files detected, process 50 and report: "Processed 50 of N changes. Run `/dev-scan` again to continue." Refresh is non-interactive — Step 5 approval gate is skipped.
