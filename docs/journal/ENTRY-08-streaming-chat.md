# ENTRY-08 — Streaming chat answers (SSE)

**Date:** 2026-05-04  
**Type:** Feature  
**Branch:** `feat/landing`  
**Version:** `0.8.0`

---

## What I Did

Added a streaming path for RAG answers so the chat UI shows text as it is generated instead of waiting for a single JSON payload. The blocking JSON endpoint remains for compatibility and as a client fallback.

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `backend/app/llm.py` | Modified | Async streaming helper |
| `backend/app/models.py` | Modified | SSE JSON shapes |
| `backend/app/routes.py` | Modified | New streaming route + shared citation helper |
| `backend/tests/test_ask_stream.py` | Created | SSE behavior + regression |
| `frontend/src/lib/api/sse.ts` | Created | Parser |
| `frontend/src/lib/api/client.ts` | Modified | Streaming client |
| `frontend/src/lib/api/schemas.ts` | Modified | Validation for stream events |
| `frontend/src/lib/api/types.ts` | Modified | Callback typing |
| `frontend/src/lib/api/index.ts` | Modified | Exports |
| `frontend/src/lib/api/__tests__/sse.test.ts` | Created | Parser tests |
| `frontend/src/components/Chat/Chat.types.ts` | Modified | `streaming` state |
| `frontend/src/components/Chat/useChat.ts` | Modified | Stream, fallback, abort |
| `frontend/src/components/Chat/__tests__/Chat.stream.test.tsx` | Created | Hook tests |
| `frontend/src/components/Chat/__tests__/Chat.test.tsx` | Modified | Updated mocks |
| `frontend/src/components/MessageBubble/MessageBubble.tsx` | Modified | Streaming caret |
| `frontend/src/app/globals.css` | Modified | Blink + reduced motion |
| `README.md` | Modified | Architecture note |
| `pyproject.toml` / `frontend/package.json` | Modified | `0.8.0` |

## Decisions

- **SSE over WebSockets** for a single request-response interaction with simpler proxy behavior.
- **Separate streaming routePrefix** so existing clients and tests keep using JSON `POST /ask`.
- **AbortController** wired from the chat hook so overlapping sends and unmount do not leave orphan UI rows.

## Still Open

- Production reverse proxy should disable buffering on the streaming path so tokens appear in real time.

## Validation

**Backend:** `ruff check`, `ruff format --check`, `mypy --strict app/`, `ISO_AUDIT_TESTING=1 pytest -v` — 34 passed (4 new streaming tests).

**Frontend:** `npm run type-check`, `npm run lint`, `npm run build`, `npm test` — 21 passed (6 new streaming tests).
