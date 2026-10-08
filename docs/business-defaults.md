# Decision C: Business defaults

> **Status:** our proposed default, for the KPO to validate. Fill in the **KPO feedback** column.

## Approval and escalation

Nothing is ever sent to a prospect automatically. Every quote has a named human sender.

| Level | When it applies | KPO feedback |
|---|---|---|
| **Analyst can send** | Monthly fee < $2,500 **and** cleanup < $5,000 **and** price override ≤ 5% from the engine **and** data confidence is High | |
| **Manager approval** | Anything not covered by the analyst rule | |
| **Partner approval** | Monthly fee ≥ $6,000, **or** cleanup ≥ $10,000, **or** discount > 15%, **or** margin < 45% | |
| **Override reason codes** | Competitive, Strategic client, Referral, Scope uncertainty, Other (free text required) | |

## Proposal structure

| # | Section | Source | KPO feedback |
|---|---|---|---|
| 1 | Cover | Template | |
| 2 | Our understanding of your business | Analysis + call transcript | |
| 3 | Books health findings | Analysis (with evidence) | |
| 4 | Recommended scope | Scope builder | |
| 5 | Package comparison | Pricing engine | |
| 6 | Cleanup project | Pricing engine | |
| 7 | Onboarding timeline (weeks 1–4) | Template | |
| 8 | Assumptions and volume bands | Pricing engine | |
| 9 | What we need from you | Template + open items from the call | |
| 10 | Terms | Template | |
| 11 | Acceptance / e-signature | E-sign integration | |

## Commercial terms

| Term | Default | KPO feedback |
|---|---|---|
| Billing | Monthly in advance, net 15 | |
| Contract term | 12 months, 30-day termination notice | |
| Cleanup payment | 50% upfront, 50% on completion | |
| Quote validity | 30 days | |
| Price review | Annually | |
| Currency | USD (INR, GBP, AUD, AED configurable) | |

## Data access

| Topic | Default | KPO feedback |
|---|---|---|
| Primary access path | The prospect invites the KPO as an **Accountant user** (QuickBooks Online / Xero / Zoho Books); a KPO analyst connects our app | |
| Fallback 1 | The prospect's admin connects via our prospect portal | |
| Fallback 2 | The prospect uploads exports (trial balance, general ledger, transaction detail, AR/AP aging) | |
| History pulled | 24 months (minimum 12) | |
| Access revoked | 30 days after the quote is sent, if the deal is lost | |
| Raw data purged | 90 days after a lost deal (metrics and the quote are kept) | |

## Meetings and transcripts

| Topic | Default | KPO feedback |
|---|---|---|
| Meeting platform | **Zoom**, using native cloud-recording transcripts (`recording.transcript_completed` webhook) | |
| Other platforms | Microsoft Teams and Google Meet via the same internal contract | |
| Universal fallback | Recall.ai meeting bot | |
| Notetaker | Not required | |
| Recording consent | Disclosure in the calendar invite + platform banner, logged on the deal | |

## Internal service levels

| Measure | Target | KPO feedback |
|---|---|---|
| Draft quote ready after the transcript arrives | ≤ 60 minutes | |
| Quote sent after the consultation | Within 1 business day | |
| Human time per quote | 35–45 minutes | |
