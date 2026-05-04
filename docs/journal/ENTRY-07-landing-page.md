# Entry 07 — Calibre-Styled Landing Page

**Date:** 2026-05-03
**Type:** Feature
**Branch:** `feat/landing`
**Version:** `0.7.0`

---

## What I Did

Shipped a dedicated marketing surface at `/` aimed at the Calibre visual language: dark navy→ice gradient, Manrope typography (weights 300/500), pill CTAs with glow shadows, scroll-driven navigation blur, and a hand-rolled constellation canvas (three pseudo-depth layers, parallax, reduced-motion static paint). The interactive demo continues unchanged at `/chat`, isolated via Next.js route groups so chat keeps its existing Inter-backed shell.

Sections below the hero explain hybrid search, citations, PDF upload, and the built-in NIST catalog; a three-step pipeline explains the workflow; seven tech pills summarize the stack; a gradient band repeats the demo call-to-action; the footer carries builder attribution.

Design tokens live on `.calibre-theme` in `globals.css`, keeping landing styling scoped away from the chat route.

## Files Touched (table: File | Action | Notes)

| File | Action | Notes |
|------|--------|-------|
| `frontend/src/app/(landing)/*` | Added / updated | Layout gradient + composed page |
| `frontend/src/app/(chat)/chat/page.tsx` | Added | Chat entry `/chat` |
| `frontend/src/app/globals.css` | Modified | Calibre variables + reduced motion |
| `frontend/src/components/landing/**` | Added | All landing sections + canvas hook |
| `frontend/tailwind.config.ts` | Modified | Manrope font token |
| `frontend/package.json` | Modified | `motion`, version bump |
| `README.md` | Modified | Documented both URLs |

## Decisions (rationale bullets)

- **Canvas in TypeScript** keeps bundle small and matches Calibre’s bespoke radial-cluster feel versus particle libraries.
- **CSS variables on `.calibre-theme`** avoids leaking landing palette into `/chat` while satisfying Tailwind arbitrary color ergonomics.
- **`motion` dependency** powers staggered reveals already assumed by prior frontend architecture notes.

## Still Open (known gaps)

- GitHub / docs links remain `#` placeholders until real URLs exist.

## Validation (commands + results)

```
cd frontend
npm run type-check   # pass
npm run lint         # pass
npm run build        # pass — `/` + `/chat`
npm test             # pass — 15 tests
```
