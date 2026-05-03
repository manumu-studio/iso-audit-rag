# PR-0.4.0 — Retrieval pipeline and `/ask` endpoint

**Branch:** `feat/retrieval` → `main`
**Version:** `0.4.0`
**Date:** 2026-05-03
**Status:** ✅ Ready to merge

---

## Summary

This change introduces hybrid retrieval (BM25 plus pgvector similarity with reciprocal rank fusion) and wires it to Anthropic Claude for compliance-oriented answers. Clients can call `POST /ask` with a natural-language question and receive an answer, citations aligned to retrieved controls, and metadata describing latency and configuration. Health checks continue to live beside the new route on a shared router, and the automated suite adds deterministic fusion tests plus mocked handler coverage.

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `app/models.py` | Created | `/ask` schemas |
| `app/search.py` | Created | Retrieval + fusion |
| `app/llm.py` | Created | Claude integration |
| `app/embeddings.py` | Created | Embeddings client |
| `app/db.py` | Created | Pool helpers |
| `app/routes.py` | Created | HTTP endpoints |
| `app/main.py` | Modified | Lifespan + router |
| `app/config.py` | Modified | New settings |
| `tests/test_rrf.py` | Created | Fusion tests |
| `tests/test_ask.py` | Created | Handler tests |
| `tests/conftest.py` | Modified | Test bootstrap |
| `pyproject.toml` | Modified | Release + typing |
| `.github/workflows/backend-ci.yml` | Modified | CI typing scope |
| `README.md` | Modified | Quickstart |

## Architecture Decisions

| Decision | Why |
|----------|-----|
| Reciprocal rank fusion | Parameter-light merge of lexical and dense rankings without extra services |
| Regex citations | Matches bracketed control identifiers against retrieved rows only |
| Mocked external APIs in tests | Keeps CI reliable without secrets or live LLM calls |

## Testing Checklist

- [x] `uv run ruff check .`
- [x] `uv run mypy --strict app/ tests/`
- [x] `uv run pytest -v`
- [x] Manual `/health` smoke still documented

## Deployment Notes

- Requires PostgreSQL with pgvector, populated `controls`, and valid OpenAI plus Anthropic credentials in the runtime environment.
- Start the API with `uv run uvicorn app.main:app --reload` after bringing up the database container.

## Validation

```text
uv run ruff check .        -> All checks passed!
uv run mypy --strict app/ tests/ -> Success: no issues found in 14 source files
uv run pytest -v           -> 11 passed
```
