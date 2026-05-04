# PR-0.8.0 — Streaming chat answers (SSE)

**Branch:** `feat/landing` → `main`  
**Version:** `0.8.0`  
**Date:** 2026-05-04  
**Status:** ✅ Ready to merge

---

## Summary

This change adds a Server-Sent Events endpoint that streams model output token-by-token while reusing the same retrieval pipeline as the existing JSON `POST /ask` route. The chat page consumes the stream with `fetch` and a small incremental parser, shows a short “searching” phase then renders text as it arrives, displays citations and diagnostics only after the stream completes, and automatically falls back to the JSON endpoint if streaming fails. In-flight streams are aborted when the user sends a new question or navigates away.

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| Backend `llm`, `models`, `routes` | Modified | Streaming helper + `/ask/stream` |
| `backend/tests/test_ask_stream.py` | Created | Coverage |
| Frontend `lib/api` (sse, client, schemas, types, index) | Modified / created | Client + validation |
| Frontend Chat + MessageBubble + globals | Modified | UX + caret |
| Frontend tests | Modified / created | Chat + SSE |

## Architecture Decisions

| Decision | Why |
|----------|-----|
| Keep JSON `/ask` | Stable contract, tests, and fallback |
| Custom SSE parser | POST bodies are not supported by `EventSource` |
| AbortController from chat hook | Prevents overlapping streams and orphan placeholders |

## Testing Checklist

- [x] Backend unit/integration tests (`pytest`)
- [x] Frontend unit tests (`vitest`)
- [x] `npm run type-check`, `npm run lint`, `npm run build`
- [ ] Manual: ask a question on `/chat` against a live API and confirm tokens stream, then citations appear

## Deployment Notes

- Response sets `X-Accel-Buffering: no`. Ensure the edge/reverse proxy does not buffer SSE (for Nginx: `proxy_buffering off` on the streaming location).

## Validation

**Backend:** `ruff check`, `ruff format --check`, `mypy --strict app/`, `ISO_AUDIT_TESTING=1 pytest -v` → 34 passed (4 new streaming tests).

**Frontend:** `npm run type-check`, `npm run lint`, `npm run build`, `npm test` → 21 passed (6 new streaming tests).
