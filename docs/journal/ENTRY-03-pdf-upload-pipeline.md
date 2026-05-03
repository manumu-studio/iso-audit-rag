# ENTRY-03 — PDF upload pipeline

**Date:** 2026-05-03
**Type:** Feature
**Branch:** `feat/pdf-upload`
**Version:** `0.3.0`

---

## What I Did

Implemented a multipart `POST /upload` endpoint that ingests a single PDF, chunks page text with overlap, generates embeddings, and writes rows into a dedicated `documents` table for later hybrid search. Added a small CLI to download public NIST sample PDFs for demos, plus automated tests for chunking and the upload path (with external services mocked in CI).

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `scripts/create-schema.sql` | Created | Controls + documents + indexes |
| `scripts/download-sample-pdfs.py` | Created | Sample compliance PDFs |
| `app/pdf.py` | Created | Extract + chunk |
| `app/db.py` | Created | Pool + schema bootstrap |
| `app/embeddings.py` | Created | OpenAI batch embeddings |
| `app/models.py` | Created | Upload response model |
| `app/routes.py` | Created | Upload + persistence |
| `app/main.py` | Updated | Lifespan + router |
| `app/config.py` | Updated | Upload size limit |
| `pyproject.toml` | Updated | PyMuPDF, multipart, type overrides |
| `.gitignore` | Updated | Ignore downloaded samples |
| `README.md` | Updated | Demo commands |
| `tests/test_pdf.py` | Created | Unit coverage |
| `tests/test_upload.py` | Created | Route tests with mocks |
| `tests/conftest.py` | Updated | Client wiring |
| `.github/workflows/backend-ci.yml` | Updated | Stricter mypy scope |

## Decisions

- Applied SQL bootstrap as multiple asyncpg executions so idempotent DDL runs reliably.
- Kept CI free of Docker and paid APIs by mocking embeddings and DB I/O in upload tests.
- Prefer `logging` over stdout in the embedding helper for production hygiene.

## Still Open

- Wire hybrid retrieval so answers can cite both catalog controls and uploaded documents (planned next milestone).
- Optional OCR path for scanned PDFs is explicitly out of scope for this iteration.

## Validation

```text
$ uv run ruff check .
All checks passed!

$ uv run mypy --strict app/ tests/
Success: no issues found in 14 source files

$ uv run pytest -v -q
15 passed
```
