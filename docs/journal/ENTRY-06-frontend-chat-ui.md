# Entry 06 — Frontend Chat UI + RAG Pipeline + Monorepo Restructure

**Date:** 2026-05-03
**Type:** Feature
**Branch:** `feat/frontend`
**Version:** `0.6.0`

---

## What I Did

Built the full Next.js chat UI and wired up the complete RAG pipeline so the Calibre interview demo works end-to-end. Before this, the backend was a scaffold with only `/health`. Now a user can type compliance questions, get grounded answers with citation pills, and upload PDFs for document-level search.

### Backend — RAG Pipeline (11 modules, ~1,040 lines)

Wired the full retrieval-augmented generation pipeline into `backend/app/`:

- **`routes.py`** — `/health`, `/ask`, `/upload` endpoints. `/ask` embeds the question, runs hybrid search, generates a Claude answer, extracts bracket citations via regex, returns structured `AskResponse`. `/upload` validates PDF, extracts text with PyMuPDF, chunks with overlap, embeds, stores in `documents` table.
- **`search.py`** — Hybrid search: BM25 (`ts_rank` + `plainto_tsquery`) and vector similarity (`<=>` operator), fused with Reciprocal Rank Fusion (k=60). Deterministic tie-break by alphabetical control ID.
- **`llm.py`** — Claude answer generation with compliance analyst system prompt. Formats search results as numbered context blocks.
- **`embeddings.py`** — OpenAI `text-embedding-3-small` (1536 dims) with batch processing (100 texts/call).
- **`chunker.py`** — OSCAL JSON parser that walks `catalog.groups[*].controls[*]` recursively, converts dotted IDs to parenthetical format (e.g., `ac-2.1` → `AC-2(1)`), filters withdrawn controls, extracts statement prose.
- **`pdf.py`** — PyMuPDF text extraction with page-aware chunking (2000 char max, 200 char overlap, sentence boundary detection).
- **`db.py`** — asyncpg pool lifecycle with idempotent schema creation via `scripts/create-schema.sql`.
- **`models.py`** — Pydantic models aligned with frontend Zod schemas (AskResponse, UploadResponse with `document_id` UUID field, Citation, MetaInfo).
- **`config.py`** — Settings via Pydantic with environment variable binding for all API keys and tuning params.
- **`main.py`** — App factory with lifespan (DB pool init/close), CORS for localhost origins, `ISO_AUDIT_TESTING=1` bypass for CI.

Supporting files:

- **`scripts/ingest.py`** — Offline CLI: parse OSCAL JSON → chunk → embed → upsert into `controls` table.
- **`scripts/create-schema.sql`** — Idempotent schema: `controls` + `documents` tables with HNSW indexes on embeddings, GIN indexes on tsvectors.
- **`data/NIST_SP-800-53_rev5_catalog.json`** — 10MB OSCAL catalog (1,014 controls).

### Frontend — Chat UI (10 components)

- **Next.js 15 + React 19 + Tailwind 4** with strict TypeScript (all 8 flags).
- **10 components** following the 4-file pattern: Chat, MessageList, MessageInput, MessageBubble, EmptyState, CitationPanel, CitationPill, MetaFooter, UploadButton, Toast.
- **API client** (`src/lib/api/`) with Zod validation at every fetch boundary. Three functions: `askQuestion`, `uploadDocument`, `checkHealth`.
- **Markdown rendering** via `react-markdown`. Bracket citations like `[AC-2]` rendered as styled pill badges.
- **Citation panel** with control ID, title, family, relevance score bar.
- **PDF upload** with file picker, XHR progress tracking, success/error toasts.
- **Empty state** with 4 clickable example questions.
- **Responsive layout** with `dvh` units and `sm:` breakpoints.

### Infrastructure

- **Backend restructured** from repo root into `backend/` for monorepo symmetry.
- **Husky v9** with 3 hooks: pre-commit (lint/typecheck both ends), commit-msg (conventional format + Golden Goose Rule), pre-push (full build + tests).
- **Frontend CI** — lint → type-check → build on Node 20, scoped to `frontend/**`.
- **Backend CI** — updated paths for `backend/` working directory, added `ISO_AUDIT_TESTING=1` for pytest.
- **Vercel config** with security headers.
- **PACKET-07** test suite documentation — 12 cursor task files specifying tests for all backend modules and frontend components.

## Files Touched

| Directory/File | Action | Notes |
|----------------|--------|-------|
| `backend/app/` (11 modules) | Created | Full RAG pipeline: routes, search, LLM, embeddings, chunker, PDF, DB |
| `backend/scripts/` | Created | Ingestion CLI + idempotent schema SQL |
| `backend/data/` | Created | NIST SP 800-53 OSCAL JSON catalog |
| `frontend/` (entire directory) | Created | Next.js 15 project with 10 components |
| `frontend/src/lib/api/` | Created | Typed fetch wrapper with Zod at every boundary |
| `.github/workflows/frontend-ci.yml` | Created | Lint + type-check + build on Node 20 |
| `.github/workflows/backend-ci.yml` | Modified | Monorepo paths + ISO_AUDIT_TESTING env var |
| `.husky/` | Created | 3 hooks: pre-commit, commit-msg, pre-push |
| `systemd/` | Created | EC2 deployment service file |
| `docs/build-packets/PACKET-07-*.md` | Created | Test suite packet spec |
| `docs/cursor-tasks/PACKET-07/` | Created | 12 cursor task specification files |

## Decisions

- **Hybrid search with RRF, not a separate reranker.** BM25 + vector + RRF fusion is simpler and avoids an extra model dependency. k=60 matches the literature default.
- **asyncpg raw queries, no ORM.** Direct SQL keeps pgvector operations explicit and avoids abstraction overhead for a small schema.
- **UploadResponse returns `document_id` UUID.** Aligned backend Pydantic model with frontend Zod schema to prevent runtime validation failures.
- **`ISO_AUDIT_TESTING=1` env flag.** Skips DB pool initialization so tests and CI run without Postgres.
- **Next.js 15 App Router, not Pages Router.** RSC where beneficial; chat page is client component (stateful).
- **Tailwind 4, no component library.** Custom Claude-style design.
- **Zod at every fetch boundary.** Never trust `response.json()` with `as Type`.
- **XHR for uploads, fetch for queries.** XHR provides `upload.onprogress` for real progress tracking.

## Validation

```bash
# Backend
cd backend
ISO_AUDIT_TESTING=1 uv run pytest -v        # passes
uv run ruff check .                          # clean
uv run mypy --strict app/ scripts/ tests/    # clean (13 modules)

# Frontend
cd frontend
npx tsc --noEmit     # clean
npm run lint         # clean
npm run build        # clean
```
