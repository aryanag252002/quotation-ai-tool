# Decision A: How we analyse a prospect's books

> **Status:** our proposed default, for the KPO to validate.
> Implemented in `web/lib/engine/analysis.ts`; the demo prospect scores 53/100 health, Complex tier.
> Fill in the **KPO feedback** column with *Agree*, *Change to …* or *Drop*, and add anything your senior reviewers check that's missing (see the end of this doc).

## Principles

1. **Deterministic.** Every signal below is computed by code from the prospect's ledger. The AI only *explains* the results. It never computes or invents a number.
2. **Ledger-agnostic.** Signals are defined on our canonical ledger model, so the same rules work for QuickBooks Online, Zoho Books, Xero, Sage, NetSuite and file exports. The "How computed" column shows the QuickBooks Online source as the reference example.
3. **Honest about gaps.** If a source system can't provide a signal (e.g. bank-feed "For Review" items aren't in the QBO API), the signal becomes an automatic **pre-call question** instead of a guess.

## Data window and sizing

- Pull **24 months** of history (minimum 12).
- Volume drivers use the **last 6 months**, sized as `max(avg_6m, 0.85 × p90_12m)` so seasonal peaks are covered without pricing at the very worst month.

## Signals

Legend: 🟢 healthy / simple · 🟡 attention · 🔴 problem / complex

### Volume (drive monthly hours)

| # | Signal | How computed (QBO reference) | 🟢 / 🟡 / 🔴 | Effect on effort | KPO feedback |
|---|---|---|---|---|---|
| V1 | Bank + card transactions per month | Purchase, Deposit, Transfer and card lines | — | Bookkeeping driver | |
| V2 | Number of bank accounts | Account type *Bank*, active and used in window | — | Reconciliation driver | |
| V3 | Number of credit-card accounts | Account type *CreditCard* | — | Reconciliation driver | |
| V4 | Sales invoices per month | Invoice + SalesReceipt | — | AR driver | |
| V5 | Customer payments per month | Payment | — | AR driver | |
| V6 | Vendor bills per month | Bill | 0 bills → AP not in use | AP driver | |
| V7 | Bill payments per month | BillPayment | — | AP driver | |
| V8 | Payroll runs per month, est. headcount | Payroll liability/expense JEs, payroll vendors (Gusto, ADP…) | — | Payroll driver | |
| V9 | Manual journal entries per month | JournalEntry | ≤5 / 6–20 / >20 | Month-end close driver | |
| V10 | Active customers / vendors | Distinct counterparties with transactions | — | AR/AP, 1099 | |
| V11 | 1099-eligible vendors | Vendor 1099 flag, or non-corporate payees >$600 | — | Year-end driver | |
| V12 | Seasonality | p90 ÷ average monthly volume | ≤1.3 / ≤1.6 / >1.6 | Sizing buffer | |
| V13 | Growth trend | Last 12 months vs prior 12 months volume (year on year, so seasonality cancels out) | ≤10% / ≤30% / >30% | Flags volume-band clause | |

### Books quality (drive the one-time cleanup fee)

| # | Signal | How computed (QBO reference) | 🟢 / 🟡 / 🔴 | Effect on effort | KPO feedback |
|---|---|---|---|---|---|
| Q1 | Months since last reconciliation, per account | TransactionList report `cleared=Reconciled`, latest date | ≤1 / 2–3 / >3 | Cleanup reconciliation hours | |
| Q2 | Uncleared items older than 60 days | `cleared=UnCleared`, older than 60 days | 0–10 / 11–50 / >50 | Cleanup | |
| Q3 | Uncategorized / Ask My Accountant / Suspense | Balance and transaction count in those accounts | 0 / <1% of expenses / ≥1% | Cleanup (3 min per txn) | |
| Q4 | Undeposited funds older than 30 days | Open Undeposited Funds items | 0 / ≤20 / >20 | Cleanup (3 min per item) | |
| Q5 | Opening Balance Equity ≠ 0 | Balance sheet | 0 / non-zero (🟡) | Fixed 2 h cleanup | |
| Q6 | Negative balances in bank / AR / AP / assets | Balance sheet by month | none / 1 / >1 | Cleanup + flag | |
| Q7 | AR > 90 days %, AP > 90 days % | Aging reports | <10% / 10–25% / >25% | Cleanup (5 min per stale item) | |
| Q8 | Possible duplicates | Same amount + payee within ±3 days | 0–5 / 6–20 / >20 | Cleanup (5 min each) | |
| Q9 | Unapplied payments / credits | Open unapplied Payment / VendorCredit | 0–5 / 6–20 / >20 | Cleanup | |
| Q10 | Chart-of-accounts hygiene | Account count, near-duplicate names | ≤80 / 81–150 / >150 | CoA restructure 4–8 h | |
| Q11 | Receipt attachment coverage (expenses > $75) | Attachable count ÷ transactions | >70% / 30–70% / <30% | Info only (proposal note) | |
| Q12 | Bank-feed "For Review" backlog | **Not available via API → pre-call question** | — | Cleanup if large | |

### Structural complexity (multipliers and extra services)

| # | Signal | How computed (QBO reference) | 🟢 / 🟡 / 🔴 | Effect on effort | KPO feedback |
|---|---|---|---|---|---|
| S1 | Multi-currency | Preferences + % of foreign-currency transactions | off / <10% / ≥10% | ×1.15 if ≥10% | |
| S2 | Classes / locations / departments in use | Preferences + tagging rate | none / 1 dimension / 2+ | ×1.10 per dimension (max ×1.20) | |
| S3 | Multiple entities / intercompany | Due-to / due-from accounts; confirmed on call | 1 / 2+ (🔴) | Consolidation service | |
| S4 | Inventory | Inventory Asset account, inventory items | no / yes (🔴) | Inventory service | |
| S5 | Sales-tax jurisdictions | Tax agencies, filing frequency | 0 / 1–2 / 3+ | Sales-tax service | |
| S6 | Payment processors / e-commerce clearing | Accounts or vendors named Stripe, Shopify, PayPal, Square, Amazon | 0 / 1 / 2+ | Clearing reconciliation service | |
| S7 | Deferred revenue / revenue recognition | Deferred revenue accounts with activity | no / yes (🔴) | +2 h per month to close | |
| S8 | Fixed-asset & loan schedules | FA accounts, long-term liabilities with activity | 0 / 1–3 / >3 | +30 min per schedule per month | |
| S9 | Accounting basis | Preferences (cash / accrual) + AR/AP usage | cash / accrual (🟡) | ×1.10 if accrual | |
| S10 | Industry | AI-inferred from chart of accounts + top vendors/customers; **analyst confirms** | — | Industry factor (see pricing model) | |

### Backlog

| # | Signal | How computed (QBO reference) | 🟢 / 🟡 / 🔴 | Effect on effort | KPO feedback |
|---|---|---|---|---|---|
| B1 | Last clean month | Latest month where all accounts are reconciled and Q3 ≈ 0 | ≤1 / 2–3 / >3 months behind | Catch-up months for cleanup | |
| B2 | Books closed through | Closing date in preferences | current FY / prior FY / never | Flag | |

## Outputs of the analysis

| Output | Rule | KPO feedback |
|---|---|---|
| **Complexity tier** | Structure points (🟡 = 1, 🔴 = 2): 0–2 Simple · 3–5 Standard · 6–9 Complex · 10+ Highly complex. Books quality is scored separately (health score) so messy books don't masquerade as structural complexity | |
| **Books health score (0–100)** | 100 − (🟡 × 3) − (🔴 × 8) across Quality + Backlog signals, floored at 0 | |
| **Pricing drivers** | V-signals and S-signals passed to the pricing engine | |
| **Cleanup drivers** | Q-signals and B1 passed to the cleanup calculator | |
| **Pre-call questions** | Generated for every signal that's 🔴, unknown, or not available from the source system | |

## Questions for the KPO's senior reviewers

1. When you open a new prospect's QuickBooks, what are the **first five things** you look at?
2. Which signal above would **most change your price** if you saw it, and which ones do you never look at?
3. Are any thresholds wrong for your typical client (e.g. is >150 accounts really "messy")?
4. What red flags make you **decline** a prospect or insist on a cleanup project first?
5. Anything you check outside the ledger (bank statements, tax filings, payroll reports, an e-commerce platform)?
