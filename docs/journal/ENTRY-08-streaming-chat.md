# ENTRY-08 — SSE streaming, portfolio README, and architecture docs

**Date:** 2026-05-04  
**Type:** Feature  
**Branch:** `feat/streaming`  
**Version:** `0.8.0`

---

## What I Did

Added a streaming path for RAG answers so the chat UI shows text as it is generated instead of waiting for a single JSON payload. The blocking JSON endpoint remains for compatibility and as a client fallback. Also rewrote the README into a portfolio-grade document with live screenshots, and created a full architecture documentation suite with mermaid diagrams.

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| **Streaming — Backend** | | |
| `backend/app/llm.py` | Modified | Async streaming helper |
| `backend/app/models.py` | Modified | SSE JSON shapes |
| `backend/app/routes.py` | Modified | New `/ask/stream` route + shared citation helper |
| `backend/tests/test_ask_stream.py` | Created | SSE behavior + regression (4 tests) |
| **Streaming — Frontend** | | |
| `frontend/src/lib/api/sse.ts` | Created | Incremental SSE parser |
| `frontend/src/lib/api/client.ts` | Modified | `askQuestionStream` with fetch + ReadableStream |
| `frontend/src/lib/api/schemas.ts` | Modified | Zod schemas for stream events |
| `frontend/src/lib/api/types.ts` | Modified | `AskQuestionStreamCallbacks` type |
| `frontend/src/lib/api/index.ts` | Modified | Re-exports |
| `frontend/src/lib/api/__tests__/sse.test.ts` | Created | Parser tests (3 tests) |
| `frontend/src/components/Chat/Chat.types.ts` | Modified | `streaming` status variant |
| `frontend/src/components/Chat/useChat.ts` | Modified | Stream, fallback, AbortController |
| `frontend/src/components/Chat/__tests__/Chat.stream.test.tsx` | Created | Hook streaming tests (3 tests) |
| `frontend/src/components/Chat/__tests__/Chat.test.tsx` | Modified | Updated mocks |
| `frontend/src/components/MessageBubble/MessageBubble.tsx` | Modified | Streaming caret |
| `frontend/src/app/globals.css` | Modified | Blink keyframe + reduced motion |
| **README and Documentation** | | |
| `README.md` | Rewritten | Portfolio-grade with screenshots, architecture, API table, stack |
| `frontend/public/assets/landing-hero.png` | Created | Landing page hero screenshot |
| `frontend/public/assets/landing-full.png` | Created | Full landing page scroll screenshot |
| `frontend/public/assets/chat-ui.png` | Created | Chat empty state screenshot |
| `docs/architecture/DIAGRAM-CI-CD.md` | Created | CI/CD pipeline, git hooks, production infra (4 mermaid diagrams) |
| `docs/architecture/DIAGRAM-DATA-PIPELINE.md` | Created | OSCAL + PDF ingestion, chunking, embedding (2 mermaid + 1 ER) |
| `docs/architecture/DIAGRAM-REQUEST-FLOW.md` | Created | Query → retrieval → LLM → SSE → render (3 mermaid diagrams) |
| **Housekeeping** | | |
| `frontend/src/lib/api/__tests__/client.test.ts` | Modified | Removed `as` type assertions |
| `backend/app/main.py` | Modified | Version bump + production CORS origin |
| `backend/pyproject.toml` / `frontend/package.json` | Modified | `0.8.0` |
| `CLAUDE.md` | Modified | Phase status → v0.8.0 |
| `DEVELOPMENT_JOURNAL.md` | Modified | Restored v0.7.0 row + added v0.8.0 |

## Decisions

- **SSE over WebSockets** for a single request-response interaction with simpler proxy behavior.
- **Separate streaming route** so existing clients and tests keep using JSON `POST /ask`.
- **AbortController** wired from the chat hook so overlapping sends and unmount do not leave orphan UI rows.
- **Mermaid over ASCII** for architecture diagrams — GitHub renders natively, more maintainable.

## Still Open

- Production reverse proxy should disable buffering on the streaming path so tokens appear in real time.

## Validation

**Backend:** `ruff check`, `ruff format --check`, `mypy --strict app/`, `ISO_AUDIT_TESTING=1 pytest -v` — 34 passed (4 new streaming tests).

**Frontend:** `npm run type-check`, `npm run lint`, `npm run build`, `npm test` — 21 passed (6 new streaming tests).
