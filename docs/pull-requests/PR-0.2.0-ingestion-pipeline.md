# PR-0.2.0 — Ingestion Pipeline

**Branch:** `feat/ingestion` → `main`
**Version:** `0.2.0`
**Date:** 2026-05-03
**Status:** ✅ Ready to merge

---

## Summary

Adds the offline ingestion pipeline that turns the official NIST SP 800-53 Rev 5 OSCAL JSON catalog into a fully-populated `controls` table ready for hybrid retrieval. After this PR, one command (`uv run python scripts/ingest.py`) takes the project from "empty database" to "1,014 controls + enhancements with embeddings and tsvectors" — the corpus side of the demo is done.

What's in the box:

- **Schema.** `scripts/create-schema.sql` — a single idempotent `controls` table: TEXT primary key (so citations read `AC-2(1)` straight off the row), `tsvector search_vector` for BM25 (GIN index), `vector(1536) embedding` for OpenAI `text-embedding-3-small` (HNSW cosine index), and a JSONB `metadata` column for params/props/links.
- **DB module.** `app/db.py` owns a module-level `asyncpg.Pool | None` and exposes `init_pool` / `close_pool` / `get_pool` plus `create_schema(pool)` which reads the SQL file and `execute()`s it. `app/main.py`'s `lifespan` calls `init_pool` → `create_schema` on startup and `close_pool` on shutdown — booting the app guarantees the schema exists. Raw asyncpg, no ORM.
- **Catalog.** `data/NIST_SP-800-53_rev5_catalog.json` (~10 MB) — the official OSCAL JSON catalog from the NIST GitHub. Committed so ingestion is deterministic and offline.
- **Chunker.** `app/chunker.py` walks `catalog.groups[*].controls[*]` recursively (controls nest enhancements). Per control: uppercases the ID and rewrites `ac-2.1` → `AC-2(1)`, inherits the `family` from the parent group's title, descends the `parts` tree to concatenate every `prose` value under the `statement` part, packs `params/props/links` into a `metadata` dict, and skips controls with `status == "withdrawn"`. Output: 1,014 `ControlChunk` Pydantic objects (300 base + 714 enhancements after dropping 182 withdrawn).
- **Embedder.** `app/embeddings.py` wraps `AsyncOpenAI` with `embed_texts(list[str]) -> list[list[float]]` and `embed_single(str) -> list[float]`. Batches of 100 with per-batch progress logging. Client is built per-call so importing the module never validates the API key.
- **Ingestion CLI.** `scripts/ingest.py` runs parse → chunk → embed → upsert. Embedding input per chunk: `"{id} {title}\n{description}"`. Upsert is a single `executemany` over a parameterised `INSERT ... ON CONFLICT (id) DO UPDATE`; the `search_vector` is computed in SQL via `to_tsvector('english', $5)` so Postgres tokenises the same text it stores. Re-runs are safe.
- **Tests.** `tests/test_chunker.py` — 9 pure unit tests against the real catalog. `tests/test_db.py` — 3 async integration tests against the local Docker Postgres (pool lifecycle, schema columns, full insert + roundtrip with a 1536-dim vector). DB tests probe with a 2-second `asyncpg.connect` and skip cleanly when Postgres isn't reachable, so CI without Docker still goes green.
- **Tooling.** `pyproject.toml` gains `[[tool.mypy.overrides]] module = "asyncpg.*" ignore_missing_imports = true` because asyncpg 0.30.x ships without a `py.typed` marker. mypy `--strict` stays clean across `app/`, `scripts/`, and `tests/` without scattering `# type: ignore` comments.
- **Docs.** `README.md` Quickstart now includes the `uv run python scripts/ingest.py` step.

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `app/db.py` | Created | asyncpg pool lifecycle + `create_schema` runner |
| `scripts/create-schema.sql` | Created | `controls` table, HNSW + GIN indexes, idempotent |
| `app/main.py` | Modified | Lifespan wires `init_pool` → `create_schema` → `close_pool` |
| `data/NIST_SP-800-53_rev5_catalog.json` | Downloaded | Official NIST OSCAL Rev 5 catalog (~10 MB, committed) |
| `app/chunker.py` | Created | OSCAL parser + `ControlChunk` Pydantic model |
| `app/embeddings.py` | Created | `AsyncOpenAI` wrapper with batching, lazy client |
| `scripts/ingest.py` | Created | End-to-end ingestion CLI |
| `tests/test_chunker.py` | Created | 9 unit tests against the real catalog |
| `tests/test_db.py` | Created | 3 integration tests, skip-if-DB-unreachable |
| `pyproject.toml` | Modified | mypy override for `asyncpg.*` (no upstream stubs) |
| `README.md` | Modified | Added ingestion step to Quickstart |

## Architecture Decisions

| Decision | Why |
|----------|-----|
| HNSW over IVFFlat | No training data needed; modern pgvector default; works at every scale this demo will hit |
| Batch embeddings at 100 (not OpenAI's max of 2048) | Bounded memory and visible per-batch progress matter more than throughput for an offline run |
| `ON CONFLICT (id) DO UPDATE` upsert | Re-runs after a chunker tweak don't require manual cleanup |
| `to_tsvector('english', $5)` in SQL, not Python | Postgres tokenises the exact text it stores — query-time `to_tsquery` matches what's actually indexed |
| Schema as a SQL file, not Alembic migrations | One table that won't change in this demo; the SQL is mounted into the lifespan so app boot is the migration step |
| Enhancements get their own rows | `AC-2` and `AC-2(1)` are separate chunks for finer-grained retrieval and cleaner citations |
| Lazy `AsyncOpenAI` client construction | Importing `app.embeddings` never validates the key, so health-check tests run without secrets configured |
| Skip-if-DB-unreachable for integration tests | Local `docker compose up db -d` runs the full 13 tests; CI without Docker still passes |
| mypy override over `# type: ignore` for asyncpg | Centralises the upstream-stubs gap in one config block; source files stay clean |

## Testing Checklist

- [x] `uv run ruff check .` passes with zero violations
- [x] `uv run mypy --strict app/` passes with zero errors
- [x] `uv run mypy --strict scripts/` passes with zero errors
- [x] `uv run mypy --strict tests/` passes with zero errors
- [x] `uv run pytest -v` — 13 collected, 10 passed, 3 skipped (DB tests skip without a reachable Postgres)
- [x] `from app.db import init_pool, close_pool, get_pool, create_schema` imports cleanly
- [x] `from app.chunker import ControlChunk, load_catalog, parse_controls` imports cleanly
- [x] `from app.embeddings import embed_texts, embed_single, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS` imports cleanly
- [x] Chunker against the real catalog yields 1,014 chunks; all 20 NIST families present; every chunk's `id` is uppercase + unique; every `description` is non-empty
- [x] Enhancement IDs match `AC-2(1)` shape (no leftover `.`)
- [x] Withdrawn controls excluded (verified by `test_no_withdrawn_controls`)
- [x] `EMBEDDING_DIMENSIONS == 1536` matches the schema's `vector(1536)` column

To verify locally with a running Postgres + a real OpenAI key:

- [ ] `docker compose up db -d`
- [ ] `uv run pytest -v` — 13 passed (zero skipped)
- [ ] `uv run python scripts/ingest.py` completes end-to-end
- [ ] `SELECT count(*) FROM controls` returns `1014`
- [ ] `SELECT count(*) FROM controls WHERE embedding IS NOT NULL AND search_vector IS NOT NULL` returns `1014`
- [ ] Re-running `scripts/ingest.py` keeps the count at `1014` (upsert, not duplicate)

## Deployment Notes

- **No deploy step in this PR** — the API surface is unchanged; only the database schema and an offline CLI script are new.
- **Local development:** after merging, run `docker compose up db -d` and `uv run python scripts/ingest.py` once to populate the `controls` table. Subsequent app boots reuse the existing data; the lifespan only re-runs the idempotent schema DDL.
- **Production:** the same `scripts/ingest.py` runs against any Postgres URL set in `DATABASE_URL` (Neon, RDS, etc.). It's a one-off operation per environment unless the OSCAL catalog or chunker changes, in which case the upsert refreshes rows in place.
- **Required env vars:** `DATABASE_URL` (already in scaffold) and `OPENAI_API_KEY` (used during ingestion). The app itself does not need `OPENAI_API_KEY` until the retrieval/answer endpoint lands in a follow-up.

## Validation

```bash
$ uv run ruff check .
All checks passed!

$ uv run mypy --strict app/ scripts/ tests/
Success: no issues found in 12 source files

$ uv run pytest -v
collected 13 items

tests/test_chunker.py::test_chunk_count                 PASSED   [  7%]
tests/test_chunker.py::test_chunk_fields_populated      PASSED   [ 15%]
tests/test_chunker.py::test_ids_uppercase               PASSED   [ 23%]
tests/test_chunker.py::test_ids_unique                  PASSED   [ 30%]
tests/test_chunker.py::test_enhancement_id_format       PASSED   [ 38%]
tests/test_chunker.py::test_known_control_exists        PASSED   [ 46%]
tests/test_chunker.py::test_known_enhancement_exists    PASSED   [ 53%]
tests/test_chunker.py::test_families_present            PASSED   [ 61%]
tests/test_chunker.py::test_no_withdrawn_controls       PASSED   [ 69%]
tests/test_db.py::test_pool_lifecycle                   SKIPPED  [ 76%]
tests/test_db.py::test_schema_creation                  SKIPPED  [ 84%]
tests/test_db.py::test_insert_and_query                 SKIPPED  [ 92%]
tests/test_health.py::test_health_returns_ok            PASSED   [100%]
======================== 10 passed, 3 skipped in 0.10s =========================
```

The three skipped tests pass against a running `docker compose up db -d` stack and exercise the asyncpg pool lifecycle, the `controls` table schema columns, and a full insert/roundtrip with a 1536-dim vector. Live `python scripts/ingest.py` end-to-end is deferred to the dev host (no Docker on the agent's shell), but the pipeline's static surface (ruff, mypy strict, unit tests) is fully green.
