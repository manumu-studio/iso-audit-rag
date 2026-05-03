# ENTRY-02 — Retrieval pipeline and natural-language `/ask` API

**Date:** 2026-05-03
**Type:** Feature
**Branch:** `feat/retrieval`
**Version:** `0.4.0`

---

## What I Did

Shipped the retrieval stack behind a single JSON API: the server embeds the user question, runs hybrid lexical + vector retrieval fused with reciprocal rank fusion, prompts Claude with grounded excerpts, and returns an answer plus structured citations and latency metadata. Routes were consolidated behind an `APIRouter`, and automated tests cover fusion math and the HTTP handler with mocks so CI stays fast and deterministic.

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `app/models.py` | Created | Request/response contracts |
| `app/search.py` | Created | BM25, vectors, RRF |
| `app/llm.py` | Created | Anthropic messaging |
| `app/embeddings.py` | Created | OpenAI embeddings |
| `app/db.py` | Created | Connection pool helpers |
| `app/routes.py` | Created | HTTP surface |
| `app/main.py` | Modified | Router wiring |
| `app/config.py` | Modified | Tunables |
| `tests/test_rrf.py` | Created | Fusion regression tests |
| `tests/test_ask.py` | Created | Handler smoke tests |
| `tests/conftest.py` | Modified | Test-only env flag |
| `pyproject.toml` | Modified | Version + typing config |
| `.github/workflows/backend-ci.yml` | Modified | Stricter CI typing |
| `README.md` | Modified | Usage snippet |

## Decisions

- Kept CI green without a database by skipping pool startup whenever automated tests set a dedicated environment flag, while preserving normal pool initialization for local servers.
- Left reranking out of the hot path; fusion ranks results cheaply and predictably.
- Returned HTTP 502 with structured JSON bodies when upstream embedding or generation APIs fail, logging stack traces server-side.

## Still Open

- Frontend chat shell and streaming responses remain future milestones.
- Operational hardening (auth, rate limits, tracing) is out of scope for this iteration.

## Validation

```bash
uv run ruff check .
uv run mypy --strict app/ tests/
uv run pytest -v
```

Latest run: all checks passed; 11 tests green.
