# QuoteIQ

An AI-assisted quotation engine for accounting outsourcing (KPO) firms. It turns a 1–2 day manual quoting
process into roughly 30–60 minutes of human time: connect the prospect's books, analyse them
deterministically, run a sharper consultation on the KPO's existing meeting platform, and produce a
scoped, priced, approved proposal.

## Repository

| Path | What it is |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | Product & technical architecture (connectors, canonical ledger, transcripts, LLM design, HITL, security, MVP, roadmap) |
| [`docs/analysis-framework.md`](docs/analysis-framework.md) | **Decision A**: the 35 signals we compute from a prospect's books, with thresholds |
| [`docs/pricing-model.md`](docs/pricing-model.md) | **Decision B**: the deterministic pricing model (time standards, rates, multipliers, packages, cleanup) |
| [`docs/business-defaults.md`](docs/business-defaults.md) | **Decision C**: approval rules, proposal structure, terms, access, meetings |
| [`docs/kpo-validation-checklist.md`](docs/kpo-validation-checklist.md) | Agenda for the meeting where the KPO validates A–C |
| [`design-system/quoteiq/MASTER.md`](design-system/quoteiq/MASTER.md) | UI design system (generated with ui-ux-pro-max, with applied overrides) |
| [`web/`](web) | Front-end MVP skeleton: Next.js 16 + Tailwind v4 + shadcn/ui, mock data, real pricing engine |

## Run the demo

```bash
cd web
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # pricing engine unit tests
pnpm build        # production build
```

Suggested walkthrough: **Dashboard → Quotes pipeline → Brightside Coffee Roasters**, then follow the 7 steps
(Data access → Analysis → Pre-call brief → Consultation → Scope → Pricing → Approval & proposal).
Open **Pricing & catalog** to change a time standard and watch the quote re-price. Use the user menu
(bottom-left) to switch between Analyst / Manager / Partner when approving. **Reset demo** on the deal
header restores the AI draft.

## Status

Phase 1: design docs + clickable front end on mock data. The analysis rules and the pricing engine are
real, tested code (`web/lib/engine`). Backend (FastAPI, Temporal, QuickBooks connector, transcript
webhooks, LLM services) follows once the KPO has validated decisions A–C.
