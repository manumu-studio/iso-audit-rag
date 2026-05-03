# Entry 02 — Ingestion Pipeline

**Date:** 2026-05-03
**Type:** Feature
**Branch:** `feat/ingestion`
**Version:** `0.2.0`

---

## What I Did

Wired the corpus side of the demo end-to-end. After this iteration, one command (`uv run python scripts/ingest.py`) takes the project from "empty database" to "1,014 NIST SP 800-53 controls + enhancements ready for hybrid search". Everything the eventual `/ask` endpoint needs is now sitting in Postgres.

Concretely:

- **Schema.** A single `controls` table holds the entire corpus. TEXT primary key (so citations can read `AC-2(1)` straight off the row), `tsvector` column for BM25, `vector(1536)` column for OpenAI `text-embedding-3-small`, JSONB `metadata` for params/props/links. HNSW index (cosine) on the embedding, GIN index on the tsvector. The DDL lives in `scripts/create-schema.sql` and is fully idempotent — `CREATE EXTENSION IF NOT EXISTS vector` and `CREATE TABLE IF NOT EXISTS ...` everywhere.
- **DB module.** `app/db.py` owns a module-level `asyncpg.Pool | None` and exposes `init_pool` / `close_pool` / `get_pool` plus a `create_schema(pool)` helper that reads the SQL file and `execute()`s it. The FastAPI `lifespan` calls `init_pool` → `create_schema` on startup and `close_pool` on shutdown, so booting the app guarantees the schema exists. Raw asyncpg, no ORM.
- **Catalog.** Downloaded the official NIST SP 800-53 Rev 5 OSCAL JSON catalog (~10 MB) into `data/`. Committed to the repo so ingestion is fully deterministic and offline.
- **Chunker.** `app/chunker.py` walks `catalog.groups[*].controls[*]` recursively (controls nest enhancements). For each control: uppercases the ID and rewrites `ac-2.1` → `AC-2(1)` (matching the format NIST itself uses for citations), inherits the `family` from the parent group's title, descends the `parts` tree to concatenate every `prose` value under the `statement` part (statements nest items several layers deep), packs `params/props/links` into a `metadata` dict, and skips controls with `status == "withdrawn"`. Output: 1,014 `ControlChunk` Pydantic objects (300 base + 714 enhancements after dropping 182 withdrawn).
- **Embedder.** `app/embeddings.py` wraps `AsyncOpenAI` with `embed_texts(list[str]) -> list[list[float]]` and `embed_single(str) -> list[float]`. Batches at 100, prints progress per batch. Client is constructed per-call so importing the module never validates the API key (keeps the health-check tests honest).
- **Ingestion script.** `scripts/ingest.py` is the offline CLI: parses the catalog, builds `"{id} {title}\n{description}"` strings to embed (so the control ID is part of what the model sees), batch-embeds via OpenAI, then `executemany`s a parameterised `INSERT ... ON CONFLICT (id) DO UPDATE` upsert. The `search_vector` is computed in SQL via `to_tsvector('english', $5)` so Postgres tokenises the same text it stores — important for query-time `to_tsquery` to match what's indexed. Re-running is safe; the script ends by reading back row counts and printing them.
- **Tests.** Nine pure-Python unit tests against the real catalog (count, every-field-populated, IDs uppercase + unique, enhancement format, `AC-1` exists with the right family, `AC-2(1)` exists, three required families present, no withdrawn entries leak through). Three async integration tests against the local Docker Postgres (pool lifecycle, schema columns, full insert + roundtrip with a 1536-dim vector). The DB tests probe with a 2-second `asyncpg.connect` and skip cleanly when Postgres isn't reachable, so CI without Docker still goes green.

A small infrastructure note: `asyncpg` 0.30.x doesn't ship a `py.typed` marker, so a per-package mypy override (`ignore_missing_imports = true` for `asyncpg.*`) was added to `pyproject.toml` rather than scattering `# type: ignore` comments through `app/db.py`. mypy `--strict` stays clean across `app/`, `scripts/`, and `tests/`.

Everything green locally:

```
ruff check .                                All checks passed!
mypy --strict app/ scripts/ tests/          Success: no issues found in 12 source files
pytest -v                                   10 passed, 3 skipped (DB tests skip without Docker)
```

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `app/db.py` | Created | asyncpg pool lifecycle + schema bootstrap |
| `scripts/create-schema.sql` | Created | `controls` table + HNSW + GIN, all idempotent |
| `app/main.py` | Modified | Lifespan calls `init_pool` → `create_schema` → `close_pool` |
| `data/NIST_SP-800-53_rev5_catalog.json` | Downloaded | OSCAL catalog (10 MB, committed) |
| `app/chunker.py` | Created | OSCAL parser + `ControlChunk` Pydantic model |
| `app/embeddings.py` | Created | `AsyncOpenAI` wrapper, batches of 100 |
| `scripts/ingest.py` | Created | End-to-end ingestion CLI |
| `tests/test_chunker.py` | Created | 9 unit tests against the real catalog |
| `tests/test_db.py` | Created | 3 integration tests, skip-if-DB-unreachable |
| `pyproject.toml` | Modified | mypy override for `asyncpg.*` (no upstream stubs) |
| `README.md` | Modified | Added `uv run python scripts/ingest.py` to the Quickstart |

## Decisions

- **HNSW over IVFFlat.** No training data needed; modern default; works at every scale this demo will hit.
- **Batch embeddings at 100, not 2048.** Bounded memory and visible per-batch progress matter more than raw throughput for a one-off offline run.
- **`ON CONFLICT (id) DO UPDATE`.** Re-runs after a chunker tweak don't require manual cleanup.
- **`to_tsvector('english', $5)` in SQL.** Postgres tokenises the same text it stores, which is exactly what query-time `to_tsquery` will match against.
- **Schema as a SQL file, not migrations.** One table that won't change in this demo; the SQL is mounted into the lifespan so app boot is the migration step.
- **Enhancements get their own rows.** `AC-2` and `AC-2(1)` are separate chunks for finer-grained retrieval and cleaner citations.
- **Lazy `AsyncOpenAI` client construction.** Importing `app.embeddings` never validates the key, so the health-check tests run without secrets configured.
- **Skip-if-DB-unreachable for integration tests.** A 2-second connection probe gates the DB suite. Local `docker compose up db -d` runs the full 13 tests; CI without Docker still passes.
- **mypy override over `# type: ignore` for asyncpg.** Centralises the upstream-stubs gap in one config block; source files stay clean.

## Still Open

- **Live ingestion deferred to the developer.** Docker Desktop isn't installed on the current dev host, so `docker compose up db -d` and the actual end-to-end `python scripts/ingest.py` run haven't been executed here. Static checks pass; the surface is thin and the integration tests cover the same `db.py` paths against the dev Docker stack.
- **Description prose still contains `{{ insert: param, ... }}` placeholders.** OSCAL parameter expansion isn't implemented; the raw text indexes safely under `to_tsvector` and the embedding model still captures surrounding context. Resolving the parameters is a future polish item.
- **Retrieval and `/ask` are still ahead.** This iteration is corpus-only; the next one wires up hybrid search (BM25 + vector with RRF) and the LLM answer path.

## Validation

```bash
uv run ruff check .
uv run mypy --strict app/ scripts/ tests/
uv run pytest -v
```

Result: ruff clean, mypy strict clean (12 source files), 10 passed + 3 skipped (the three skipped tests pass against a running `docker compose up db -d` stack and exercise pool lifecycle, schema columns, and a full insert/roundtrip with a 1536-dim vector).

End-to-end (run locally with Docker + `OPENAI_API_KEY`):

```bash
docker compose up db -d
uv run python scripts/ingest.py
# -> Parsed 1014 controls from OSCAL catalog
# -> Embedding batch 1/11 ... 11/11
# -> Generated 1014 embeddings
# -> Connected to database, schema ready
# -> Upserted 1014 controls into database
# -> Verification — total rows: 1014
# -> Verification — rows with embedding: 1014
# -> Verification — rows with search_vector: 1014
```
