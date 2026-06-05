# Python Memory Checks

Self-describing memory optimization profile for dev-scan. Read by the main agent when Python is primary language AND database/analytics dependencies detected. NOT a subagent prompt.

## Trigger

Load this file when ALL conditions met:
1. Primary language is Python (python-scan-profile.md already loaded)
2. Database/analytics deps detected in ANY manifest format: `duckdb`, `polars`, `pyarrow`, `kuzu`, `pandas`, `numpy` in `pyproject.toml [project.dependencies]`, `requirements*.txt`, `Pipfile [packages]`, or `environment.yml [dependencies]`

## Injection

Format findings as part of the `<PYTHON_CONTEXT>` block (appended to python-scan-profile.md findings). Findings feed into Step 4 issue detection, Step 5 report, and Subagent A via `<PYTHON_CONTEXT>` in architecture-prompt.md.

## Cross-Wiki Source

These checks are derived from the `database` wiki (registered in `~/.claude/wikis.json`). For additional context during scanning, resolve the database wiki path and Read: `chunked-and-streaming-processing.md`, `zero-copy-data-exchange.md`, `data-pipeline-memory-profiling.md` (cap: 3 articles).

---

## Memory Anti-Pattern Checks

### 1. Vectorization (Step 4)

| Check | Severity | Detection |
|-------|----------|-----------|
| Python loops over array data | HIGH | Grep `for.*in.*(range|enumerate)` in files that import `numpy`, `pandas`, `polars`, or `pyarrow`. If loop body contains array indexing (`\[i\]`, `.iloc\[`, `.loc\[`), flag: "Consider vectorized operation" |
| `.apply()` with Python function | MEDIUM | Grep `\.apply\(` in files importing `pandas` — often masks Python-speed loops |
| `.iterrows()` / `.itertuples()` | MEDIUM | Grep `\.iterrows\(\)\|\.itertuples\(\)` — row-by-row iteration of DataFrames |

### 2. Memory Management (Step 4)

| Check | Severity | Detection |
|-------|----------|-----------|
| Unbounded result sets | HIGH | Grep `\.fetchall\(\)\|\.read_parquet\(\)\|pq\.read_table\(` without `batch_size`, `columns`, or LIMIT. Flag: "Consider chunked reading or column projection" |
| Missing chunked processing | MEDIUM | Files reading Parquet/CSV that call `read_*` without `batch_reader`, `scan_`, or `LazyFrame`. Flag: "Consider streaming/lazy API" |
| Dtype inefficiency | LOW | `pd.read_csv` without `dtype` parameter — auto-inferred dtypes may waste 2-8x memory |

### 3. Zero-Copy Compliance (Step 4)

| Check | Severity | Detection |
|-------|----------|-----------|
| Unnecessary `.to_pandas()` | MEDIUM | Grep `\.to_pandas\(\)` — converts Arrow-backed data to Pandas, copying memory. Flag if downstream code could use Arrow/Polars API directly |
| Unnecessary `.to_numpy()` | LOW | Grep `\.to_numpy\(\)` on Arrow or Polars objects — copies unless `zero_copy_only=True` |
| Missing Arrow backbone | INFO | Project uses DuckDB + Pandas but not PyArrow — `.fetchdf()` copies via Pandas; `.fetch_arrow_table()` is zero-copy |

### 4. DuckDB-Specific (Step 4)

| Check | Severity | Detection |
|-------|----------|-----------|
| No `memory_limit` set | MEDIUM | Grep DuckDB connection setup for `memory_limit`. Absence risks OOM on large datasets |
| No `temp_directory` set | LOW | Grep for `temp_directory`. Absence means DuckDB can't spill to disk when memory_limit hit |

### 5. Profiling Setup (Step 1)

| Check | Severity | Detection |
|-------|----------|-----------|
| No memory profiler in dev deps | LOW | Check `[project.optional-dependencies]` or `[dependency-groups]` for `memray` or `tracemalloc` usage. Absence with data pipeline code = gap |
