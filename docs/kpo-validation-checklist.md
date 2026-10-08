# KPO validation meeting: agenda and checklist

**Goal:** the KPO reviews *our* proposed defaults and tells us what to change. We don't ask them to design anything from scratch.

**Duration:** about 90 minutes · **Attendees:** a senior partner (pricing owner), a senior reviewer (does the analysis today), and the sales/BD lead.

## Agenda

| # | Topic | Time | Material | Outcome |
|---|---|---|---|---|
| 1 | Demo walkthrough of the product | 15 min | Clickable demo (`web/`) | Reactions to the workflow and screens |
| 2 | How we analyse the books | 25 min | [`analysis-framework.md`](analysis-framework.md) | KPO feedback column filled, missing signals added |
| 3 | Pricing model | 30 min | [`pricing-model.md`](pricing-model.md) + live Settings screen | Time standards, rates, multipliers and packages confirmed |
| 4 | Business defaults | 15 min | [`business-defaults.md`](business-defaults.md) | Approval rules, terms, access and meeting platform confirmed |
| 5 | Next steps | 5 min | — | Owners and dates |

## Checklist: what we must leave the meeting with

- [ ] Confirmed or corrected **analysis signals and thresholds**
- [ ] Confirmed or corrected **time standards** and **rate card** (cost rates and target margin)
- [ ] Confirmed **package definitions** (what's in Essential / Growth / Premium)
- [ ] Confirmed **approval thresholds** and who the manager and partner approvers are
- [ ] **Meeting platform** in use, and whether their admin can grant API access for transcripts
- [ ] **Accounting-system mix** of their prospects (% QuickBooks Online / Xero / Zoho / other)
- [ ] Their **proposal template** and terms (send us a recent example)
- [ ] **20–30 past quotes** with the prospect's key numbers and outcome, for calibration ← *most important*
- [ ] A named **internal champion** and pricing owner

## After the meeting

1. Update `web/lib/config/defaults.ts` with the confirmed values. The demo re-prices immediately.
2. Replay the past quotes through the pricing engine and tune the time standards until results are within ±10%.
3. Lock v1 of the analysis and pricing rules, then start the backend build (see [`architecture.md`](architecture.md) §13).
