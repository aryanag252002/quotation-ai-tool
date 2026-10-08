# QuoteIQ web (front-end MVP skeleton)

Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind v4 · shadcn/ui (radix-nova) · Recharts · Vitest.

```bash
pnpm dev        # dev server
pnpm test       # engine unit tests
pnpm typecheck  # tsc --noEmit
pnpm lint
pnpm build
```

## Structure

| Path | Purpose |
|---|---|
| `app/(app)/…` | Authenticated app: dashboard, pipeline, intake, deal workspace (`deals/[id]/…` 7 steps), settings |
| `app/portal/[token]` | Prospect-facing portal (connect books / upload, questionnaire, consent) |
| `lib/types.ts` | Domain types mirroring the data model in `docs/architecture.md` §10 |
| `lib/data/` | Service layer. Returns mock data today, swaps to the backend API later without UI changes |
| `lib/engine/analysis.ts` | Decision A: signal definitions, RAG thresholds, complexity tier, books-health score, volume sizing |
| `lib/engine/pricing.ts` | Decision B: deterministic pricing, cleanup and approval routing (pure functions, unit-tested) |
| `lib/config/defaults.ts` | Default pricing configuration (catalog, time standards, rates, packages, approval rules) |
| `lib/state/` | Deal workspace state (scope, overrides, approval) and a localStorage-backed store for the demo |
| `components/` | App shell, deal step views, settings, portal, shared status badges |

Design tokens live in `app/globals.css`; see `../design-system/quoteiq/MASTER.md`.
