# PR-0.2.0 — PDF upload pipeline

**Branch:** `feat/pdf-upload` → `main`
**Version:** `0.2.0`
**Date:** 2026-05-03
**Status:** ✅ Ready to merge

---

## Summary

Adds backend support for uploading compliance PDFs: validation, text extraction with PyMuPDF, overlapping chunks, OpenAI embeddings, and storage in Postgres with pgvector and full-text vectors. Includes sample PDF download tooling, README instructions, and pytest coverage (mocks keep CI deterministic).

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `scripts/create-schema.sql` | Created | Documents (+ controls baseline) |
| `scripts/download-sample-pdfs.py` | Created | NIST samples |
| `app/pdf.py` | Created | Extraction + chunking |
| `app/db.py` | Created | Pool + schema |
| `app/embeddings.py` | Created | Embedding client |
| `app/models.py` | Created | Response DTO |
| `app/routes.py` | Created | Upload handler |
| `app/main.py` | Updated | Lifespan + routes |
| `app/config.py` | Updated | Upload cap |
| `pyproject.toml` | Updated | Deps + typing |
| `.gitignore` | Updated | Sample PDF dir |
| `README.md` | Updated | How to demo |
| `tests/test_pdf.py` | Created | PDF unit tests |
| `tests/test_upload.py` | Created | Upload tests |
| `tests/conftest.py` | Updated | ASGI client |
| `tests/fixtures/.gitkeep` | Created | Placeholder |
| `.github/workflows/backend-ci.yml` | Updated | mypy includes tests |

## Architecture Decisions

| Decision | Why |
|----------|-----|
| Dedicated `documents` table | Keeps unstructured uploads separate from catalog control rows. |
| Delete-then-insert on filename collision | Simple replacement semantics for demo uploads. |
| Mocked services in upload tests | Keeps CI fast without Docker or API keys. |

## Testing Checklist

- [x] `uv run ruff check .`
- [x] `uv run mypy --strict app/ tests/`
- [x] `uv run pytest -v`
- [x] Sample PDF script downloads valid `%PDF` files (local verification)
- [ ] Manual smoke: run API + Postgres locally, upload a sample PDF, query row counts

## Deployment Notes

- Apply boot-time schema (handled by app lifespan against `scripts/create-schema.sql`).
- Requires `OPENAI_API_KEY` for real embedding calls.
- Ensure `pgvector` extension remains enabled (init script / hosting equivalent).

## Validation

```text
$ uv run ruff check .
All checks passed!

$ uv run mypy --strict app/ tests/
Success: no issues found in 14 source files

$ uv run pytest -v -q
15 passed
```
