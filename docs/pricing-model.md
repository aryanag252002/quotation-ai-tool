# Decision B: Deterministic pricing model

> **Status:** our proposed default, for the KPO to validate.
> Implemented in `web/lib/engine/pricing.ts` with defaults in `web/lib/config/defaults.ts`. All values are editable in the product's **Settings** screen. Fill in the **KPO feedback** column with *Agree* or *Change to …*.

## Principle

**The AI never sets the price.** The price comes from a fixed formula over the drivers the analysis produced. The same inputs always give the same quote, every number can be traced back to its source, and every analyst prices the same way.

## The formula

```
monthly_hours = Σ_service (driver × time_standard) × complexity_multiplier (capped ×1.5, L1 services only)
              + review (15% of preparer hours, L3)
              + client management (2 h fixed per month, L3)

monthly_fee   = Σ_role (hours_role × price_rate_role)  → round up to nearest $50, minimum $500
price_rate    = cost_rate ÷ (1 − target_margin)          target margin = 60%

cleanup_fee   = cleanup_hours × blended L1/L2 rate × 1.10 → round to nearest $100 (50% upfront)
```

## Rate card

| Role | Who | Cost rate (USD/h) | Price rate (USD/h) at 60% margin | KPO feedback |
|---|---|---|---|---|
| L1 | Bookkeeper | $10 | $25 | |
| L2 | Senior accountant | $16 | $40 | |
| L3 | Manager (review + client management) | $28 | $70 | |

## Service catalog and time standards

| Service | Driver → time standard | Role | KPO feedback |
|---|---|---|---|
| Bookkeeping (transaction categorization) | 1.5 min per bank + card transaction | L1 | |
| Bank & card reconciliation | 30 min per bank account, 25 min per card account | L1 | |
| Monthly financial statements | 0.5 h fixed (P&L + balance sheet) | L2 | |
| Accounts receivable | 4 min per invoice + 1.5 min per payment | L1 | |
| Collections follow-up (optional) | 10 min per overdue customer | L1 | |
| Accounts payable | 4 min per bill + 2 min per bill payment | L1 | |
| Payment-processor clearing | 1.5 h per platform (Stripe, Shopify, …) | L1 | |
| Payroll journal entries (client runs payroll) | 20 min per payroll run | L1 | |
| Payroll processing (we run payroll; replaces payroll JEs) | 30 min per run + 3 min per employee per run | L2 | |
| Month-end close | 4 h + 10 min per manual JE + 30 min per schedule (accruals, prepaids, FA, loans) + 2 h if deferred revenue | L2 | |
| Management reporting | 1.5 h (P&L, BS, CF, KPIs) | L2 | |
| Dimension reporting & commentary | 1 h per tracking dimension + 2 h commentary | L2 | |
| Sales-tax filing | 1.5 h per jurisdiction per filing (monthly equivalent) | L2 | |
| Inventory accounting | 3 h + 0.5 min per inventory transaction | L2 | |
| Multi-entity consolidation | 3 h per additional entity + 1 h intercompany | L2 | |
| 1099 & year-end package | 15 min per 1099 vendor + 6 h (annual; ÷ 12 when bundled in Premium) | L2 | |

## Complexity multipliers

Applied to L1 services only, and multiplied together. The combined multiplier is capped at **×1.50**.

| Condition (from analysis) | Multiplier | KPO feedback |
|---|---|---|
| Accrual basis (S9) | ×1.10 | |
| Multi-currency ≥10% of transactions (S1) | ×1.15 | |
| Each tracking dimension in use: class / location / department (S2) | ×1.10 each, max ×1.20 | |
| Industry: construction / job costing | ×1.15 | |
| Industry: non-profit | ×1.10 | |
| Industry: e-commerce | ×1.05 | |
| Industry: all others | ×1.00 | |

## Packages

Services the analysis shows are **required** (e.g. sales tax, when sales tax is set up in the books) are included in every tier and can only be removed with an analyst override and a reason.

| | Essential | Growth (recommended) | Premium |
|---|---|---|---|
| Bookkeeping + bank/card reconciliation | ✓ | ✓ | ✓ |
| Monthly financial statements (P&L + balance sheet) | ✓ | ✓ | ✓ |
| Accounts payable + accounts receivable | | ✓ | ✓ |
| Full month-end close (accruals, schedules) | | ✓ | ✓ |
| Payment-processor clearing reconciliation | | ✓ | ✓ |
| Management reporting package | | ✓ | ✓ |
| Payroll processing | | | ✓ |
| Collections follow-up | | | ✓ |
| Dimension reporting + commentary | | | ✓ |
| 1099 / year-end package | | | ✓ (included) |
| Dedicated manager | | | ✓ |
| Close deadline | Day 15 | Day 10 | Day 5 (+10% SLA premium) |
| Review call | Quarterly | Monthly | Monthly |
| **KPO feedback** | | | |

## One-time cleanup / catch-up fee

| Component | Time standard | KPO feedback |
|---|---|---|
| Unreconciled account-months | 45 min + 0.5 min per transaction | |
| Uncategorized / suspense transactions | 3 min each | |
| Possible duplicates | 5 min each | |
| Aged undeposited-funds items | 3 min each | |
| Stale AR / AP items (> 90 days) | 5 min each | |
| Opening Balance Equity fix | 2 h fixed | |
| Chart-of-accounts restructure | 4 h (🟡) or 8 h (🔴) | |
| Backlog months not yet booked | months × monthly bookkeeping hours × 1.2 | |

Priced at the blended L1/L2 rate (70% L1 / 30% L2) × 1.10, rounded to the nearest $100. 50% is invoiced upfront and 50% on completion.

## Protection clauses

| Rule | Default | KPO feedback |
|---|---|---|
| **Confidence rule** | If the analysis came from file uploads only, or a capability gap affects a price driver: +10% contingency **or** a "90-day true-up" clause (the analyst picks one) | |
| **Volume-band clause** | The quote states the transaction volume it was sized on. If the actual average exceeds it by >20% for 2 consecutive months, the fee moves to the next band | |
| **Minimum fee** | $500 per month | |
| **Rounding** | Monthly fee up to the nearest $50, cleanup to the nearest $100 | |

## Worked example: Brightside Coffee Roasters LLC (demo prospect)

Inputs: ~640 bank/card txns/mo, 3 bank + 2 card accounts, 60 invoices + 80 payments/mo, 90 bills + 70 bill payments/mo, Stripe + Shopify clearing, 20 manual JEs/mo, 2 sales-tax jurisdictions, accrual basis, class tracking on, 7 months unreconciled.

Sized volume is 637 transactions a month (max of the 6-month average 637 and 0.85 × 12-month p90). The complexity multiplier is accrual ×1.10 × 1 dimension ×1.10 × e-commerce ×1.05 = **×1.27**. With the default rules the engine produces:

| | Essential | Growth (recommended) | Premium |
|---|---|---|---|
| Hours / month | 36.7 h | 72.0 h | 81.1 h |
| Monthly fee | **$1,250** | **$2,550** | **$3,300** |
| Margin | 60.0% | 60.5% | 63.9% (incl. SLA premium) |

**Cleanup:** 110.8 h → **$3,600** (35 unreconciled account-months, 4,410 transactions to tick, 212 suspense items, 14 duplicates, 38 undeposited items, 46 stale AR/AP items, OBE fix, minor CoA restructure, 1 backlog month).

**Approval routing:** Manager. The fee is ≥ $2,500 and data confidence is medium (payroll headcount and bank-feed backlog came from the call, not the ledger).

These figures are covered by unit tests in `web/lib/engine/pricing.test.ts` and are recomputed live on the demo's **Pricing** screen when Settings change.

## What we need from the KPO to calibrate

- **20–30 past quotes** together with the client's books (or their key numbers) and the outcome (won/lost, and actual hours once onboarded). We replay them through this model and tune the time standards until it lands within ±10% of what the senior partner actually quoted.
