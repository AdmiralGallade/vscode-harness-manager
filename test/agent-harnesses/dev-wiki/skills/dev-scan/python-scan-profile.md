# Python Scan Profile

Self-describing language profile for dev-scan. Read by the main agent after Step 1 detects Python as primary language. NOT a subagent prompt.

## Trigger

Load this file when: `primary language == Python` (detected via `.py` file count or `pyproject.toml` / `setup.py` / `setup.cfg` presence in Step 1).

## Injection

After completing checks below, format findings as a `<PYTHON_CONTEXT>` block and pass to Subagent A (architecture-prompt.md) if the placeholder exists. Findings also feed into Step 4 issue detection and Step 5 report.

## Cross-Wiki Retrieval

If database deps detected (see python-memory-checks.md trigger), also load that companion. For convention source articles, read `~/.claude/wikis.json`, find the wiki whose `description` mentions "Python" or whose `schema.md` tags include `python`, resolve its absolute path, and Read relevant articles (cap: 5). If no Python wiki found, skip — checks still run using the patterns below.

---

## Check Categories

### 1. Project Structure (Step 1)

| Check | Severity | Detection |
|-------|----------|-----------|
| Src layout vs flat layout | INFO | `src/` directory exists with `__init__.py` inside = src layout; package at root = flat |
| Missing `__init__.py` in package dirs | MEDIUM | Glob `src/**/__init__.py` or `<pkg>/**/__init__.py`; flag dirs with `.py` files but no `__init__.py` (unless namespace package with `pyproject.toml [tool.setuptools.packages.find] namespaces = true`) |
| No `tests/` directory | HIGH | Glob `tests/` or `test/`; absence with >5 source files is HIGH |

### 2. Packaging Conventions (Step 1)

| Check | Severity | Detection |
|-------|----------|-----------|
| No `pyproject.toml` | HIGH | Only `setup.py` or `requirements.txt` = legacy packaging |
| Missing `[build-system]` | MEDIUM | `pyproject.toml` exists but lacks `[build-system]` table |
| Missing `requires-python` | MEDIUM | `[project]` exists but no `requires-python` key |
| Multiple dep managers | LOW | Both `poetry.lock` AND `uv.lock`, or `Pipfile` AND `pyproject.toml [project]` |

### 3. Type Hint Assessment (Step 4)

| Check | Severity | Detection |
|-------|----------|-----------|
| No type checker configured | MEDIUM | No `[tool.mypy]`, `mypy.ini`, `pyrightconfig.json` in project |
| mypy not strict | LOW | `[tool.mypy]` exists but `strict = true` absent |
| Untyped public functions | MEDIUM | Grep `^def [a-z]` in non-test `.py` files; sample 10 files, count functions with and without `-> ` return annotation. Flag if >5 of 10 sampled files have majority-untyped public functions |

### 4. Import Graph (Step 3b)

| Check | Severity | Detection |
|-------|----------|-----------|
| Circular imports | HIGH | In dependency map from Step 3b, detect cycles (A imports B, B imports A). Report cycle paths |
| Star imports in non-`__init__` | MEDIUM | Grep `from .* import \*` in files other than `__init__.py` |
| Relative imports outside package | LOW | Grep `from \.` in top-level scripts (not inside a package) |

### 5. Python-Specific Issues (Step 4)

| Check | Severity | Detection |
|-------|----------|-----------|
| Bare `except:` clauses | MEDIUM | Grep `except:` (no exception type) |
| Mutable default arguments | MEDIUM | Grep `def.*=\s*(\[\]|\{\}|set\(\))` — mutable default in function signature |
| Missing `__all__` in public modules | LOW | Package `__init__.py` with `from .X import` but no `__all__` definition |
| `print()` in non-CLI source | LOW | Grep `print(` in `src/` files (exclude `__main__.py`, CLI modules) |

### 6. Testing Conventions (Step 1 + Step 4)

| Check | Severity | Detection |
|-------|----------|-----------|
| No test framework configured | HIGH | No `pytest.ini`, `conftest.py`, `[tool.pytest]`, `tox.ini` with source files present |
| Test config but no test files | MEDIUM | Config exists but Glob `tests/**/*.py` returns 0 |
| No `conftest.py` | LOW | `tests/` exists but no `conftest.py` (missing shared fixtures) |
| Coverage not configured | LOW | No `[tool.coverage]` or `.coveragerc` |
