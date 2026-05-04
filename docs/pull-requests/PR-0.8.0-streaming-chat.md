# PR-0.8.0 — SSE streaming, portfolio README, and architecture docs

**Branch:** `feat/streaming` → `main`  
**Version:** `0.8.0`  
**Date:** 2026-05-04  
**Status:** ✅ Ready to merge

---

## Summary

Three additions in one version bump:

1. **SSE streaming** — a `/ask/stream` endpoint streams model output token-by-token while reusing the same retrieval pipeline as JSON `POST /ask`. The chat UI consumes the stream via `fetch` + a custom parser, renders tokens as they arrive with a typing caret, and automatically falls back to JSON if streaming fails. AbortController prevents orphan streams on re-send or navigation.

2. **Portfolio README** — complete rewrite with hero screenshot, full landing page scroll, chat UI screenshot, ASCII architecture diagram, API endpoint table, stack table, quickstart, and project structure tree.

3. **Architecture documentation** — three mermaid diagram files covering CI/CD pipeline, data ingestion pipeline, and request flow from browser to cited answer.

## Files Changed

| Area | File | Action | Notes |
|------|------|--------|-------|
| Streaming | `backend/app/{llm,models,routes}.py` | Modified | `/ask/stream` SSE endpoint |
| Streaming | `backend/tests/test_ask_stream.py` | Created | 4 tests |
| Streaming | `frontend/src/lib/api/sse.ts` | Created | Incremental SSE parser |
| Streaming | `frontend/src/lib/api/{client,schemas,types,index}.ts` | Modified | Stream client + Zod schemas |
| Streaming | `frontend/src/components/Chat/{useChat,Chat.types}.ts` | Modified | Stream hook + AbortController |
| Streaming | `frontend/src/components/Chat/__tests__/Chat.stream.test.tsx` | Created | 3 tests |
| Streaming | `frontend/src/lib/api/__tests__/sse.test.ts` | Created | 3 tests |
| Streaming | `frontend/src/components/MessageBubble/MessageBubble.tsx` | Modified | Streaming caret |
| Streaming | `frontend/src/app/globals.css` | Modified | Blink + reduced motion |
| README | `README.md` | Rewritten | Portfolio-grade with screenshots |
| README | `frontend/public/assets/*.png` | Created | 3 screenshots (hero, full, chat) |
| Architecture | `docs/architecture/DIAGRAM-CI-CD.md` | Created | 4 mermaid diagrams |
| Architecture | `docs/architecture/DIAGRAM-DATA-PIPELINE.md` | Created | 2 mermaid + 1 ER diagram |
| Architecture | `docs/architecture/DIAGRAM-REQUEST-FLOW.md` | Created | 3 mermaid diagrams |
| Housekeeping | `frontend/src/lib/api/__tests__/client.test.ts` | Modified | Removed `as` type assertions |
| Housekeeping | `backend/app/main.py` | Modified | v0.8.0 + production CORS |
| Housekeeping | `CLAUDE.md`, `DEVELOPMENT_JOURNAL.md` | Modified | Phase status + journal index |

## Architecture Decisions

| Decision | Why |
|----------|-----|
| Keep JSON `/ask` | Stable contract, tests, and fallback |
| Custom SSE parser | POST bodies are not supported by `EventSource` |
| AbortController from chat hook | Prevents overlapping streams and orphan placeholders |
| Mermaid over ASCII | GitHub renders natively, version-controllable, easier to maintain |

## Testing Checklist

- [x] Backend unit/integration tests (`pytest` — 34 passed)
- [x] Frontend unit tests (`vitest` — 21 passed)
- [x] `npm run type-check`, `npm run lint`, `npm run build`
- [x] `ruff check`, `mypy --strict`
- [ ] Manual: ask a question on `/chat` against live API and confirm tokens stream, then citations appear

## Deployment Notes

- Response sets `X-Accel-Buffering: no`. Ensure the edge/reverse proxy does not buffer SSE (for Nginx: `proxy_buffering off` on the streaming location).
- README screenshots reference `frontend/public/assets/*.png` — verify they render on GitHub after push.

## Validation

**Backend:** `ruff check`, `ruff format --check`, `mypy --strict app/`, `ISO_AUDIT_TESTING=1 pytest -v` → 34 passed (4 new streaming tests).

**Frontend:** `npm run type-check`, `npm run lint`, `npm run build`, `npm test` → 21 passed (6 new streaming tests).
