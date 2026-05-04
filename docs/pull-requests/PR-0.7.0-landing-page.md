# PR-0.7.0 — Calibre-Styled Landing Page + `/chat` Route Split

**Branch:** `feat/landing` → `main`
**Version:** `0.7.0`
**Date:** 2026-05-03
**Status:** ✅ Ready to merge

---

## Summary

Adds a full-screen Calibre-inspired landing experience at `/` (gradient hero with constellation canvas, sticky blur navigation, feature grid, how-it-works pipeline, tech badges, gradient CTA, footer) and moves the existing chat demo to `/chat` without altering chat behavior. Landing fonts use Manrope via `next/font`; chat remains on the root Inter setup.

## Files Changed (table: File | Action | Notes)

| File | Action | Notes |
|------|--------|-------|
| `frontend/src/app/(landing)/*` | Added | Landing layout + page composition |
| `frontend/src/app/(chat)/**` | Added | Passthrough layout + `/chat` page |
| `frontend/src/app/page.tsx` | Removed | Superseded by route groups |
| `frontend/src/app/globals.css` | Modified | `.calibre-theme` token block |
| `frontend/src/components/landing/**` | Added | Canvas + sections |
| `frontend/tailwind.config.ts` | Modified | Manrope stack |
| `frontend/package.json` | Modified | `motion`, `0.7.0` |
| `README.md` | Modified | `/` vs `/chat` note |

## Architecture Decisions (table: Decision | Why)

| Decision | Why |
|----------|-----|
| Nested `/chat` segment inside `(chat)` | Next.js route groups do not change URLs—parallel group-level pages would both resolve to `/` |
| Scoped `.calibre-theme` variables | Keeps chat styling untouched while unifying landing arbitrary Tailwind colors |
| Custom canvas hook | Matches Calibre-style layered clusters without pulling particle libraries |

## Testing Checklist

- [ ] `cd frontend && npm run type-check`
- [ ] `cd frontend && npm run lint`
- [ ] `cd frontend && npm run build`
- [ ] `cd frontend && npm test`
- [ ] Manual: `/` shows landing; `/chat` shows chat; CTAs navigate correctly
- [ ] Manual: toggle OS “Reduce motion” — landing respects shortened transitions / static canvas

## Deployment Notes

- No backend changes; redeploy frontend only (Vercel or equivalent).
- Ensure marketing links (`GitHub`, `Documentation`) are updated from `#` when URLs are ready.

## Validation (commands + results)

```
cd frontend
npm run type-check   # pass
npm run lint         # pass
npm run build        # pass
npm test             # pass — 15 tests
```
