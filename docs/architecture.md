# QuoteIQ — AI Quotation Engine for an Accounting KPO
### Product & Technical Architecture (v1)

> Companion decision docs: [analysis framework](analysis-framework.md) · [pricing model](pricing-model.md) · [business defaults](business-defaults.md) · [KPO validation checklist](kpo-validation-checklist.md). The clickable front-end skeleton lives in [`web/`](../web).

---

## 0. Context

A KPO/accounting-outsourcing firm takes 1–2 days to produce a quotation for a prospect: get access to the prospect's books, review history, judge complexity, write an assessment, review internally, hold a consultation, scope, price, and send. Goal: **30–60 minutes of human time**, with humans still deciding scope, price and approval.

Constraints:
- The prospect's accounting system **can be anything**: QuickBooks Online, Zoho Books, Xero, Tally, Sage, NetSuite, FreshBooks, QuickBooks Desktop, etc. The design has to be **ledger-agnostic**.
- **No meeting app of our own.** Transcripts must arrive automatically from whatever platform the KPO already uses.
- Greenfield build.

---

## 1. Challenging the assumptions first

| Your assumption | Reality / better approach |
|---|---|
| "The process takes 1–2 days" | Most of that is **elapsed time** (waiting for access, scheduling the call, waiting for review), not **work time**. Measure both. The product should cut work time to about 30–60 minutes **and** remove the waiting by running steps in parallel and sending automatic nudges. Define the SLA as "transcript received → quote ready for approval in under 60 minutes." |
| Analysis happens first, then the consultation | **Flip the value.** Analyse the data *before* the call and produce a **pre-call brief** with targeted questions ("You have 3 Stripe clearing accounts with $41k unreconciled. Who handles payouts?"). The call becomes shorter and sharper, and the transcript fills known gaps instead of starting from zero. If data access comes late, the call can still happen first. The workflow must handle either order. |
| "AI prepares pricing" | **The LLM should never set the price.** Price comes from a **deterministic, versioned pricing engine**: workload drivers × time standards × rate card. The LLM extracts drivers, explains them and drafts the narrative. This makes quotes auditable, consistent across analysts, and defensible to the prospect. |
| "Build an AI agent" | Use a **durable workflow (state machine) with bounded LLM steps**, not a free-roaming agent. Quoting is a known, repeatable process, so predictability matters more than autonomy. Agentic behaviour is limited to two sandboxed places: (a) anomaly investigation over the canonical data with read-only tools, and (b) an analyst "ask the books" chat. |
| "Full access to the accounting software" | Use **OAuth with read-only behaviour enforced in our code** (QBO has no read-only scope), pull only **12–24 months** of history only, with a **fallback upload path** (TB, GL, bank statements as exports). Many prospects won't grant OAuth to a vendor they haven't signed with yet. Desktop systems (Tally, QB Desktop) have no cloud API anyway. |
| "Build a QuickBooks integration" | Build a **connector abstraction plus a canonical ledger model**. All analysis runs on the canonical model, never on QBO- or Zoho-specific objects. Adding a ledger system then means writing one adapter, not rebuilding the analysis. |
| "Get the transcript somehow" | Use the **native transcript APIs** of Zoom, Teams and Google Meet (event-driven, no bot), matched to the deal through a **calendar event created by the product**. Use a **meeting-bot API** (e.g. Recall.ai) only as a fallback for platforms without transcript APIs. |
| One quote at the end | The prospect gets **good / better / best packages** plus a separate **one-time cleanup/catch-up** fee. That's usually where the money is, and data analysis is what reveals it. |
| Human review = reading a long report | Human review = an **exception-driven review screen**: show what's unusual, low-confidence or above approval thresholds. Don't make reviewers read 10 pages. |

---

## 2. End-to-end workflow (target timeline)

```
[1] Intake            Prospect record created (CRM webhook / form / manual)   ~2 min human
       │              → magic-link portal sent to prospect
[2] Data access       Prospect connects ledger via OAuth  OR  uploads exports  0 min KPO
       │              (+ short smart intake questionnaire)
[3] Ingest+Normalize  Pull 12–24 mo → canonical ledger → data quality checks   auto, 5–20 min
[4] Analyze           Metrics engine (deterministic) + LLM findings            auto
       │              → Complexity Profile + Pre-call Brief + question list
[5] Brief review      Analyst skims brief, edits questions                     ~10 min human  ◄ HITL #1
[6] Consultation      On the KPO's existing Zoom/Teams/Meet (scheduled via the
       │              product's calendar link so the meeting ID is known)
[7] Transcript        Webhook → fetch transcript → match to deal → extract     auto, 2–5 min
       │              requirements, answers to brief questions, open items
[8] Scope + Price     Scope builder merges data-driven + call-driven needs;
       │              pricing engine computes hours & 3 packages               auto
[9] Scope review      Analyst confirms scope/assumptions, resolves flags       ~15 min human  ◄ HITL #2
[10] Approval         Rule-based routing (discount, deal size, low confidence) ~5 min manager ◄ HITL #3
[11] Proposal         Branded proposal (web + PDF/DOCX), e-sign, CRM update    ~5 min human   ◄ HITL #4 (send)
[12] Learn            Won/lost + actual hours post-onboarding → calibrate
```
**Total human time ≈ 35–45 min.** Steps 3–4 and 7–8 run without a person.

---

## 3. System architecture

```
                   ┌──────────────────────── Web App (Next.js) ───────────────────────┐
                   │ Pipeline board · Brief · Scope builder · Pricing · Approvals ·   │
                   │ Proposal editor · Admin (rate cards, service catalog, rules)     │
                   └───────────────▲──────────────────────────────▲──────────────────┘
 Prospect Portal ──────────────────┤                              │
 (magic link: connect / upload /   │                    API Gateway (FastAPI, authz, RLS)
  questionnaire / view proposal)   │                              │
                                   ▼                              ▼
      ┌────────────────────────── Workflow Orchestrator (Temporal) ──────────────────────────┐
      │  QuoteWorkflow(deal_id): durable, resumable, human-signal steps, retries, timeouts   │
      └──┬───────────┬────────────────┬──────────────────┬───────────────┬──────────────┬────┘
         ▼           ▼                ▼                  ▼               ▼              ▼
  Connector Hub  Normalizer &   Metrics/Complexity   LLM Services    Pricing Engine  Doc Generator
  (adapters)     Data Quality   Engine (DuckDB/      (extract,       (rules, rate    (proposal
   │             (canonical     pandas, pure code)   reason, write,  cards, versions) templates→
   │             ledger)                             verify)                          PDF/DOCX/web)
   │                                                     │
   ├─ Unified accounting API (Codat / Rutter / Merge / Apideck — pick one)
   ├─ Native deep adapters (QBO, Zoho Books)  ◄ only where unified data is too shallow
   └─ File import (CSV/XLSX/PDF: TB, GL, bank stmts, Tally XML, QB Desktop exports)

  Meeting Hub: Zoom / MS Graph / Google Meet+Workspace Events webhooks; Recall.ai fallback;
               Calendar integration (Google/Outlook) for deal↔meeting matching
  Outbound:    CRM (HubSpot/Zoho CRM/Salesforce), e-sign (DocuSign/PandaDoc/Zoho Sign), email, Slack

  Data: Postgres (app + canonical ledger, RLS per tenant) · S3 (raw payloads, transcripts, docs; KMS)
        · pgvector (precedent quotes, service catalog) · Redis (rate-limit buckets, cache)
  Observability: OpenTelemetry, LLM tracing (Langfuse), eval harness, immutable audit log
```

### Why these choices
- **Temporal** (or Inngest for a lighter MVP): a quote spans days, has human-wait steps, flaky third-party APIs and webhooks. Durable execution beats hand-rolled cron and queues.
- **Python backend**: the analysis is data work (pandas/DuckDB). The frontend is Next.js.
- **Postgres + RLS**: one database for the MVP, tenant isolation built in from day one so you can sell the product to a second KPO later.

---

## 4. Ledger-agnostic data layer (the core of "any accounting software")

### 4.1 Three ingestion paths behind one `LedgerConnector` interface
```python
class LedgerConnector(Protocol):
    def capabilities(self) -> ConnectorCapabilities   # what this source can provide
    def fetch_snapshot(self, window: DateRange) -> RawSnapshot
    def to_canonical(self, raw: RawSnapshot) -> CanonicalLedger
```
1. **Unified accounting API** (recommended primary for breadth). One integration covers QBO, Xero, Zoho Books, NetSuite, Sage, FreshBooks, QB Desktop (via agent), MS Dynamics and others. It handles OAuth, app-store approvals, rate limits and schema drift. Cost: per-connection pricing, and some fields (reconciliation flags, audit trail, attachments, custom fields) may be missing. Run a **2-day bake-off** of Codat vs Rutter vs Merge on 3 real sandbox companies before committing.
2. **Native deep adapters** for the 1–2 systems that dominate the KPO's pipeline (probably QBO, and Zoho Books if they serve India or the Middle East). Build these only where the unified API lacks a signal that moves price, e.g. QBO `reconciled` status on transactions, the audit log, or the "Ask My Accountant" account. QBO needs Intuit app review and a security questionnaire for production. Plan 3–6 weeks for that.
3. **File import** (always available): TB, GL detail, AR/AP aging, bank/card statements (CSV, XLSX, PDF via OCR plus LLM table extraction), Tally XML/Excel exports. This covers prospects who refuse OAuth and desktop-only systems. Analysis is still possible, with lower confidence flagged.

The **Capabilities** object travels with the data, so downstream analysis knows what it *can't* see (e.g. "reconciliation status unknown") and either lowers confidence or adds a pre-call question. This is what keeps the system honest across ledgers.

### 4.2 Canonical ledger model (system-neutral)
- `Account` (source_id, name, source_type → **canonical class**: asset/liability/equity/income/expense + subtype such as bank, credit_card, AR, AP, clearing, suspense, payroll_liability, inventory, fixed_asset…)
- `Transaction` / `JournalLine` (date, amount, currency, account, counterparty, type: invoice/bill/payment/deposit/transfer/journal/expense/payroll, memo, is_reconciled?, created_by?, source_ref)
- `Contact` (customer/vendor, 1099/TDS flags if available), `Item`, `TaxCode`, `Dimension` (class/location/department/project/cost centre), `Entity` (multi-company), `BankFeed` stats
- `Report` snapshots: TB, P&L, BS by month (used to **tie out** the transaction pull)

**Account mapping**: rules first (source type codes), then the LLM classifies unmapped or ambiguous accounts into the canonical taxonomy with confidence scores. Low-confidence mappings go to the review queue. Mappings are cached per source system, so they get better over time.

### 4.3 QuickBooks Online: how we actually connect and pull data

**One-time setup (by us)**
1. Create an Intuit Developer account → create a **QuickBooks Online Accounting app** → get Client ID/Secret for sandbox and production, and register redirect URIs.
2. Build and test against free **sandbox companies** (pre-populated test data).
3. Before going live: privacy policy, EULA, app-assessment/security questionnaire, and enrolment in the **Intuit App Partner Program**. Read and query calls ("CorePlus") are **metered and billed** above the free credit allowance. Writes ("Core") are free, and we only read. Budget for this and verify current tiers.

**Per prospect: who clicks "Connect"**
- QBO only lets a **Master Admin, Company Admin or an Accountant user** authorize an app. There is one active connection per app per company.
- **Path A (preferred, matches today's process):** the prospect already invites the KPO as an *Accountant user*. A KPO analyst then clicks "Connect QuickBooks" in our app themselves. The prospect sees no new vendor screen and there's no friction.
- **Path B:** the prospect's admin clicks "Connect QuickBooks" in our prospect portal (Intuit-branded button).
- **Path C (fallback):** the prospect exports reports (TB, GL, Transaction Detail by Account with the Clr column, AR/AP aging) to Excel and uploads them.

**OAuth 2.0 flow (Authorization Code)**
```
Our app → https://appcenter.intuit.com/connect/oauth2
          ?client_id=…&scope=com.intuit.quickbooks.accounting
          &redirect_uri=…&response_type=code&state=<signed deal_id + nonce>
User logs into Intuit → picks the company → Consent
Intuit → our /callback?code=…&realmId=<company id>&state=…
Our backend → POST https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer (code → tokens)
   access_token  (~1 hour)  · refresh_token (rotates on use; hard max ~5 yrs, expiry returned in response)
Store {realmId, tokens} encrypted in vault → start Temporal SnapshotWorkflow(deal_id)
When finished/lost → POST revoke endpoint → connection removed
```
**Important:** the accounting scope is **read and write**. QBO has no read-only scope. "Read-only" is enforced by **us**: the QBO client is GET/query only, with no write methods compiled in, and every call is logged. We tell the prospect this plainly in the consent copy.

**What we pull (base URL `https://quickbooks.api.intuit.com/v3/company/{realmId}/`)**
| Need | Endpoint |
|---|---|
| Company profile, features on (multi-currency, classes, locations, sales tax) | `companyinfo/{id}`, `preferences` |
| Chart of accounts + balances | `query?query=select * from Account` |
| Transactions (24 mo window, paginated `STARTPOSITION`/`MAXRESULTS 1000`) | `query` on Invoice, SalesReceipt, Payment, CreditMemo, RefundReceipt, Bill, BillPayment, VendorCredit, Purchase (expenses/checks/card), Deposit, Transfer, JournalEntry, PurchaseOrder, Estimate, TimeActivity |
| Master data | Customer, Vendor, Item, Class, Department (location), TaxCode/TaxRate, Term, Employee |
| Tie-out & summaries | Reports API: `reports/TrialBalance` (per month-end), `ProfitAndLoss`, `BalanceSheet` (`summarize_column_by=Month`), `AgedReceivables`, `AgedPayables`, `GeneralLedger` (chunked by date range) |
| Reconciliation health | `reports/TransactionList?cleared=Reconciled / Cleared / UnCleared` per bank/card account. No per-transaction flag, so call once per status and join. |
| Attachments present? | `query` on Attachable (count only) |

**Limits we must design around:** ~500 req/min and ~10 concurrent requests per company. Use the batch endpoint (up to 30 ops per call). Large reports get truncated, so chunk the GeneralLedger by month. Throttle with a per-`realmId` token bucket, retry on 429 with backoff, and checkpoint per entity so a failed pull resumes.

**What QBO's API does *not* give us (so we ask on the call or use exports):** bank-feed "For Review" items that haven't been categorized yet, the audit log, detailed QBO Payroll paychecks (we infer payroll from accounts and vendors like Gusto/ADP), and bank-rule settings. These become `capabilities` gaps and automatic pre-call questions.

**Typical pull for an SMB:** ~200–2,000 API calls, 3–15 minutes. One snapshot, no continuous sync.

**Build vs buy:** our own Intuit app gives full depth (reports, `cleared` filter) and is the best fit for QBO. A unified API (Codat/Rutter/Merge/Apideck) is faster for *other* systems, but check that it exposes the Reports API and `cleared` data before relying on it for QBO.

**Integrity gate**: the sum of canonical transactions per account per month must tie to the source TB within tolerance. If it doesn't, the snapshot is flagged as incomplete and analysis continues with reduced confidence. This one check prevents most "AI hallucinated the numbers" failures.

---

## 5. Metrics & Complexity engine (deterministic, no LLM)

Computed from the canonical ledger and stored as versioned `Metric` rows (id, value, period, evidence query), so every claim in the report can cite them:

- **Volume drivers**: monthly txns by type (avg, p90, trend, seasonality); # bank and card accounts; # invoices and bills; # payroll runs; # active customers and vendors
- **Books quality** (drives cleanup fees): months since last reconciliation per account; unreconciled count; balances in uncategorized, suspense or "Ask My Accountant"; negative bank or AR balances; stale AR/AP (>90d); duplicate-looking txns; manual JE ratio; undeposited funds build-up; opening balance equity ≠ 0
- **Structural complexity**: # entities, dimensions in use, multi-currency, inventory, sales-tax/GST jurisdictions, revenue recognition patterns (deferred revenue accounts), fixed assets, loans, intercompany, payment processors (Stripe/PayPal/Shopify clearing)
- **Backlog**: last month that looks "closed", i.e. how many catch-up months
- **Industry inference** (LLM over the chart of accounts and top vendors/customers; analyst confirms)

Output: a **Complexity Profile**, a tiered score per dimension with evidence links. It doesn't collapse everything into one opaque number.

---

## 6. Meeting & transcript architecture (no meeting app of our own)

**Principle:** meetings are matched to deals by **identity, not guesswork**.

1. **Scheduling**: the pre-call brief step creates the meeting through the KPO's calendar (Google Calendar or Outlook via OAuth) with a conferencing link from their Zoom/Teams/Meet. We store `deal_id ↔ calendar_event_id ↔ meeting_id`. If the analyst schedules manually, we match via calendar sync (prospect email domain plus time window) and ask for one-click confirmation.
2. **Transcript capture (native, preferred, no bot in the call)**:
   - **Zoom**: Server-to-Server/OAuth app, cloud recording + audio transcript enabled; webhook `recording.transcript_completed` → download VTT.
   - **Microsoft Teams**: Graph change-notification subscription on online meeting transcripts → fetch `callTranscript` (needs tenant admin consent and transcription turned on in the meeting policy).
   - **Google Meet**: Meet REST API `conferenceRecords.transcripts` + Workspace Events API subscription (needs Workspace edition with transcription, plus admin consent).
3. **Fallback**: a **Recall.ai-style meeting-bot API** for platforms without transcript APIs, or for tenants that won't grant admin consent. Same downstream contract.
4. **If the KPO already uses an AI notetaker** (Fireflies, Otter, Fathom, Zoom AI Companion): pull from that tool's API/webhook instead. It's often the path of least resistance.
5. **Consent**: the recording disclosure lives in the calendar invite and the meeting platform's banner, and is logged on the deal.

All sources normalize to `Transcript {meeting_id, deal_id, segments[{speaker, role(kpo|prospect), t_start, t_end, text}]}`. Speaker roles are resolved from attendee emails.

**Post-call extraction** (LLM, structured output against a JSON schema):
- Answers to each pre-call question (with timestamp citations) → updates metric assumptions
- Requested services, frequency (monthly/weekly close), deadlines, reporting needs, systems/tools in use, payroll provider, tax obligations, budget signals, decision-makers, objections, start date
- Contradictions with the data ("Client says ~200 txns/mo; ledger shows ~640") → hard flag
- Open items → auto-drafted follow-up email

---

## 7. AI/LLM architecture

**Rule:** *LLMs read, classify, extract, reason and write. Code computes, counts and prices.* Numbers in any generated text are **template references to Metric IDs**, filled in after generation, so the model can't invent a figure.

| Task | Model tier | Pattern |
|---|---|---|
| Account/txn classification, transcript cleanup | Haiku 4.5 | batch, structured output, cached prompts |
| Transcript requirement extraction, file-table extraction | Sonnet 5.5 | JSON-schema tool output + citations (segment IDs) |
| Findings synthesis, pre-call brief, scope rationale, proposal narrative | Opus 5.5 | grounded generation over metrics + extracted requirements + precedent quotes |
| Verification ("judge") | Sonnet 5.5 | every claim must cite a metric or transcript segment; unsupported claims are removed or flagged |
| Anomaly investigation (bounded agent) | Sonnet/Opus 5.5 | read-only SQL tool over the deal's canonical tables, step and token budget, results become proposed findings for human acceptance |

- **Retrieval (RAG)**: the KPO's service catalog, SOPs, past proposals and won/lost quotes go into pgvector. Precedents are retrieved by similarity on the complexity profile, so the system can say "similar clients were priced $X–$Y".
- **Prompt and version management**: prompts are versioned in the repo, each quote records model + prompt + pricing-rule versions for reproducibility.
- **Data privacy**: use the Anthropic API with zero-data-retention or a cloud-hosted endpoint (AWS Bedrock / GCP Vertex) in the region the KPO needs. Send aggregates and samples, not full ledgers, wherever possible.

---

## 8. Scope & pricing engine (deterministic, configurable by the KPO)

1. **Service catalog** (admin-managed): bookkeeping, bank/card reconciliation, AP, AR/collections, payroll processing, sales tax/GST filing, month-end close, management reporting, FP&A, cleanup/catch-up, 1099/TDS, inventory accounting, multi-entity consolidation, and so on. Each has **workload drivers** and **time standards** (e.g. 1.2 min per categorized txn, 45 min per bank account reconciliation per month, +20% for multi-currency).
2. **Scope builder** merges (a) services implied by the data, (b) services requested in the call, and (c) the questionnaire. Each line carries its *source* (data / call / analyst) and confidence.
3. **Workload estimate** = Σ driver × standard × complexity multipliers → monthly hours (P50 and P80) + one-time cleanup hours.
4. **Price** = hours × role-blended rate × margin target → rounded to price points → **3 packages** + cleanup fee + optional add-ons. Floors, minimums and currency are set per region.
5. **Pricing rules are versioned data, not code.** Admins edit them in the UI, with a "simulate on last 20 quotes" preview before publishing.
6. **Calibration loop**: once a client is onboarded, compare actual hours (from the KPO's time tracker) with estimated hours. Suggest standard adjustments. Never auto-apply them.

---

## 9. Human-in-the-loop design

| Checkpoint | Who | What they see | Blocking? |
|---|---|---|---|
| #1 Pre-call brief | Analyst | Key findings, complexity profile, suggested questions, data gaps | Soft. The call can happen without it |
| Mapping/data-quality queue | Analyst | Only low-confidence account mappings and failed tie-outs | Yes, if they affect price drivers |
| #2 Scope review | Analyst | Scope lines with source and confidence, data-vs-call contradictions, assumptions | Yes |
| #3 Pricing approval | Manager / partner | Price vs engine output, margin, precedents, override reasons | Routed by rules: discount >X%, value >$Y, confidence <Z, new service type |
| #4 Send | Analyst/owner | Final proposal preview | Always human |

UX principles: **exception-first** (green items collapsed), **every number clickable to its evidence** (the metric query, or the transcript snippet with timestamp), **overrides require a reason code** (this trains calibration), and **nothing goes to the prospect without a named approver**.

---

## 10. Data model (app layer, Postgres)

```
Tenant ─┬─ User(role: admin|manager|analyst) 
        ├─ ServiceCatalogItem ─ WorkloadDriver ─ TimeStandard
        ├─ RateCard(version) · PricingRuleSet(version) · ApprovalPolicy
        ├─ ProposalTemplate(version)
        └─ Prospect ─ Deal(stage, owner, sla timestamps)
                        ├─ DataConnection(kind: unified|native|file, system, scopes, status, token_ref→vault)
                        ├─ Snapshot(window, capabilities, tie_out_status) ─ canonical tables (deal-scoped)
                        ├─ Metric(id, key, value, period, evidence_sql, snapshot_id)
                        ├─ Finding(type, severity, text, cited_metric_ids, status: proposed|accepted|rejected)
                        ├─ Questionnaire · Meeting(platform, external_id, cal_event_id) ─ Transcript ─ Segment
                        ├─ RequirementExtract(field, value, cited_segment_ids, confidence)
                        ├─ ScopeLine(service, source, drivers, hours_p50/p80, confidence)
                        ├─ Quote(version, packages[], cleanup_fee, ruleset_ver, ratecard_ver, model_vers)
                        ├─ Approval(step, approver, decision, reason) · Proposal(doc_ref, esign_status)
                        └─ AuditEvent (append-only: who/what/when, incl. every LLM call hash)
```

---

## 11. Security & compliance

- **Least-privilege OAuth.** Where a provider has no read-only scope (QBO), read-only is enforced in our client code and audited. Tokens are stored in a secrets vault (KMS-encrypted) and revoked automatically when the deal closes or after N days.
- **Data minimisation and retention**: raw ledger data is purged X days after a lost deal (configurable). Metrics and the quote stay. Prospect-facing consent records what is accessed and for how long.
- **Tenant isolation**: Postgres RLS, per-tenant S3 prefixes and KMS keys.
- **AuthN/Z**: SSO (Google/Microsoft), RBAC, MFA. The prospect portal uses expiring magic links.
- **LLM**: zero-retention endpoint, PII redaction of bank account numbers and tax IDs before prompts, no training on customer data, region pinning.
- **Compliance path**: SOC 2 Type I → II controls from day one (audit log, access reviews, encryption). GDPR/UK GDPR, India DPDP Act and US state privacy laws depending on where the KPO and its prospects are. Intuit, Xero and Zoho app-store security reviews.
- **Prompt-injection hygiene**: ledger memos and transcripts are untrusted input. They are never placed in system prompts, and the agent tool is read-only and deal-scoped.

---

## 12. Scalability & reliability

- Stateless API, horizontally scaled workers. Temporal handles retries and backoff per connector.
- **Per-connection rate-limit buckets** in Redis (QBO, Zoho and Xero each have per-org/per-minute limits). Paginated, resumable pulls with a checkpoint per entity type.
- Snapshot pulls are **one-shot plus optional refresh**, not continuous sync. That keeps cost and attack surface small.
- A typical SMB (≤50k txns over 24 months) analyses in minutes in DuckDB. Large prospects (NetSuite, multi-entity) get chunked pulls and an "extended analysis" SLA.
- LLM cost control: prompt caching for catalog and system prompts, Haiku for bulk classification, and only aggregates sent to Opus.

---

## 13. MVP scope (≈ 10–12 weeks, one KPO, one meeting platform)

**In**
- Prospect portal: OAuth connect via **one unified accounting API** (covering QBO + Zoho Books + Xero at minimum) **plus file upload** (TB/GL/bank CSV/XLSX)
- Canonical model, TB tie-out, ~30 core metrics, complexity profile
- Pre-call brief + question list (Opus) with metric citations
- **One** native transcript integration (whichever the KPO uses) + calendar matching; Recall.ai fallback
- Transcript extraction → scope builder → deterministic pricing engine with admin-editable catalog and rate card
- Exception-first review screens, approval routing, PDF/DOCX proposal from the KPO's template
- Audit log, RBAC, encryption, retention jobs

**Out (later)**: native deep adapters, e-sign, CRM sync, Tally connector agent, calibration loop automation, multi-tenant self-serve, prospect-facing interactive proposal, "ask the books" chat.

**MVP success metrics**: human touch time per quote ≤ 60 min (median), transcript→draft-quote ≤ 10 min, ≥ 80% of scope lines accepted without edit, final price within ±10% of what a senior partner would set (measured by shadow-quoting 20 historical deals), zero unsupported numeric claims in the eval set.

**Build order**: (1) shadow-quote dataset: collect 20–30 past quotes with their source data and transcripts. This is the eval set and the pricing calibration. (2) Canonical model + metrics. (3) Pricing engine reproducing past quotes. (4) LLM brief and extraction. (5) Transcript integration. (6) Review/approval UX. (7) Proposal generation.

---

## 14. Roadmap

- **v1.1**: CRM sync (HubSpot/Zoho CRM/Salesforce), e-sign, follow-up email drafts, Slack approvals
- **v1.2**: native QBO and Zoho Books deep adapters (reconciliation and audit-log signals), Tally/QB Desktop local export helper
- **v2**: calibration from actual hours (time-tracker integration), win-probability and price-sensitivity guidance from won/lost history, interactive web proposal with package selector
- **v2.5**: handoff to onboarding. The accepted quote's scope, metrics and findings auto-generate the onboarding plan, SOPs and cleanup task list. This is a strong expansion wedge.
- **v3**: multi-tenant SaaS for other KPOs and accounting firms, white-label, marketplace listings (Intuit/Xero/Zoho app stores)

---

## 15. Questions to answer with the KPO before building

**Commercial & pricing**
1. How do they price today: hourly, fixed monthly, per-transaction or value-based? Is there a written rate card or is it in a partner's head?
2. Can they share 20–30 past quotes **with** the underlying client data and the outcome (won/lost, actual hours later)? *(This is the most important input for the whole build.)*
3. Who approves quotes today, and what triggers escalation (deal size, discount, new service)?
4. Do they quote packages (tiers) and separate cleanup/catch-up fees?
5. Which currencies and regions do they quote in? US/UK/AU/India/Middle East clients?

**Process**
6. Where does the 1–2 days actually go? (Waiting for access vs analysis vs internal review vs writing.)
7. What does the current assessment report look like? Get 3 examples, good and bad.
8. What services do they offer, and what effort drivers do their seniors use mentally?
9. Does the consultation always happen after data access, or sometimes before or instead of it?
10. How many quotes per month today, and the target? What's the current win rate?

**Systems & data**
11. Distribution of prospects' accounting systems (QBO / Xero / Zoho / Tally / NetSuite / Desktop / spreadsheets)?
12. How do they get access today: accountant invite, shared credentials (a security risk to fix), or exports?
13. Will prospects accept OAuth from a third-party app pre-contract? Any prospect pushback history?
14. How much history do they review (months)? Do they need payroll, bank statements or tax filings too?

**Meetings**
15. Which meeting platform (Zoom/Teams/Meet) and which licence tier? Is cloud recording and transcription enabled? Will their IT admin grant API consent?
16. Do they already use a notetaker (Fireflies, Otter, Zoom AI Companion)?
17. How are calls scheduled today (Calendly, manual invites)? How are recording consent disclosures handled?

**Outputs, compliance, ownership**
18. Proposal format/template, e-sign tool, CRM in use?
19. Data residency, client NDAs, SOC 2 or ISO requirements from their clients? How long may prospect data be retained?
20. Who owns the pricing rules after launch? Who is the internal champion and the final decision-maker?
21. Commercial model with you: build fee + SaaS per seat or per quote? Can you resell the product to other KPOs (IP ownership)?

---

## 16. Key risks & mitigations

| Risk | Mitigation |
|---|---|
| Prospects refuse OAuth | File-upload path + capability-aware confidence; portal explains read-only access clearly |
| Unified API lacks critical signals | Bake-off before committing; native adapter for top system; capabilities flags |
| Admin won't grant meeting-API consent | Notetaker-API or meeting-bot fallback |
| Price drift / bad estimates | Deterministic engine, shadow-quote evals, approval thresholds, calibration loop |
| LLM fabrication | Numbers by reference only, citation-required judge pass, TB tie-out gate |
| App-store review delays (Intuit, etc.) | Start review in week 1; unified API covers the gap |

---

## 17. Verification (how we'll know the build works)

- **Golden dataset**: 20–30 historical deals replayed end-to-end in staging (sandbox ledger companies + real or anonymised transcripts). Compare scope and price to the actual quote: target ±10% and ≥80% scope-line agreement.
- **Connector contract tests** per ledger system using QBO/Xero/Zoho sandbox companies; TB tie-out must pass.
- **LLM evals** (in CI): extraction precision/recall on labelled transcripts; zero uncited numeric claims; injection tests with malicious memos.
- **Pilot**: 2 weeks shadow mode (product runs in parallel with the manual process), then 2 weeks assisted mode. Track touch time, cycle time and override rate.

---

