/**
 * Deterministic analysis engine: Decision A in docs/analysis-framework.md.
 * Signal values come from the canonical ledger; this file only classifies them.
 */
import type { MonthlyVolume, Rag, SignalGroup, SignalValue } from "@/lib/types";

export interface SignalDef {
  id: string;
  group: SignalGroup;
  name: string;
  source: string;
  thresholds: string;
  effect: string;
  /** Classify a value. Omitted = informational driver (no RAG). */
  rate?: (v: number | boolean) => Rag;
}

/** Bands where higher values are worse: ≤green → green, ≤amber → amber, else red. */
const band = (green: number, amber: number) => (v: number | boolean) => {
  const n = Number(v);
  return n <= green ? "green" : n <= amber ? "amber" : "red";
};
/** Bands where lower values are worse (e.g. attachment coverage %). */
const bandLow = (green: number, amber: number) => (v: number | boolean) => {
  const n = Number(v);
  return n > green ? "green" : n >= amber ? "amber" : "red";
};
const flagRed = (v: number | boolean) => (v ? "red" : "green");
const flagAmber = (v: number | boolean) => (v ? "amber" : "green");

export const SIGNALS: SignalDef[] = [
  // Volume
  { id: "V1", group: "volume", name: "Bank + card transactions / month", source: "Purchase, Deposit, Transfer, card lines", thresholds: "—", effect: "Bookkeeping driver" },
  { id: "V2", group: "volume", name: "Bank accounts", source: "Account type Bank (active, used)", thresholds: "—", effect: "Reconciliation driver" },
  { id: "V3", group: "volume", name: "Credit-card accounts", source: "Account type CreditCard", thresholds: "—", effect: "Reconciliation driver" },
  { id: "V4", group: "volume", name: "Sales invoices / month", source: "Invoice + SalesReceipt", thresholds: "—", effect: "AR driver" },
  { id: "V5", group: "volume", name: "Customer payments / month", source: "Payment", thresholds: "—", effect: "AR driver" },
  { id: "V6", group: "volume", name: "Vendor bills / month", source: "Bill", thresholds: "0 = AP not used", effect: "AP driver" },
  { id: "V7", group: "volume", name: "Bill payments / month", source: "BillPayment", thresholds: "—", effect: "AP driver" },
  { id: "V8", group: "volume", name: "Payroll runs / month · headcount", source: "Payroll JEs, payroll vendors", thresholds: "—", effect: "Payroll driver" },
  { id: "V9", group: "volume", name: "Manual journal entries / month", source: "JournalEntry", thresholds: "≤5 / 6–20 / >20", effect: "Close driver", rate: band(5, 20) },
  { id: "V10", group: "volume", name: "Active customers / vendors", source: "Distinct counterparties", thresholds: "—", effect: "AR / AP, 1099" },
  { id: "V11", group: "volume", name: "1099-eligible vendors", source: "Vendor 1099 flag", thresholds: "—", effect: "Year-end driver" },
  { id: "V12", group: "volume", name: "Seasonality (p90 ÷ avg)", source: "Monthly volume series", thresholds: "≤1.3 / ≤1.6 / >1.6", effect: "Sizing buffer", rate: band(1.3, 1.6) },
  { id: "V13", group: "volume", name: "Growth trend (last 12m vs prior 12m)", source: "Monthly volume series", thresholds: "≤10% / ≤30% / >30%", effect: "Volume-band clause", rate: band(10, 30) },
  // Books quality
  { id: "Q1", group: "quality", name: "Months since last reconciliation", source: "TransactionList cleared=Reconciled", thresholds: "≤1 / 2–3 / >3", effect: "Cleanup reconciliation", rate: band(1, 3) },
  { id: "Q2", group: "quality", name: "Uncleared items > 60 days", source: "TransactionList cleared=UnCleared", thresholds: "0–10 / 11–50 / >50", effect: "Cleanup", rate: band(10, 50) },
  { id: "Q3", group: "quality", name: "Uncategorized / Ask My Accountant (% of expenses)", source: "Balances in suspense-type accounts", thresholds: "0 / <1% / ≥1%", effect: "Cleanup (3 min / txn)", rate: (v) => (Number(v) === 0 ? "green" : Number(v) < 1 ? "amber" : "red") },
  { id: "Q4", group: "quality", name: "Undeposited funds > 30 days", source: "Undeposited Funds open items", thresholds: "0 / ≤20 / >20", effect: "Cleanup (3 min / item)", rate: band(0, 20) },
  { id: "Q5", group: "quality", name: "Opening Balance Equity ≠ 0", source: "Balance sheet", thresholds: "0 / non-zero", effect: "Fixed 2 h cleanup", rate: flagAmber },
  { id: "Q6", group: "quality", name: "Negative balances (bank / AR / AP / assets)", source: "Balance sheet by month", thresholds: "0 / 1 / >1", effect: "Cleanup + flag", rate: band(0, 1) },
  { id: "Q7", group: "quality", name: "AR > 90 days (% of AR)", source: "Aged receivables", thresholds: "<10% / 10–25% / >25%", effect: "Cleanup (5 min / item)", rate: (v) => (Number(v) < 10 ? "green" : Number(v) <= 25 ? "amber" : "red") },
  { id: "Q8", group: "quality", name: "Possible duplicates", source: "Same amount + payee ±3 days", thresholds: "0–5 / 6–20 / >20", effect: "Cleanup (5 min each)", rate: band(5, 20) },
  { id: "Q9", group: "quality", name: "Unapplied payments / credits", source: "Open Payment / VendorCredit", thresholds: "0–5 / 6–20 / >20", effect: "Cleanup", rate: band(5, 20) },
  { id: "Q10", group: "quality", name: "Chart-of-accounts size", source: "Account count, near-duplicates", thresholds: "≤80 / 81–150 / >150", effect: "CoA restructure 4–8 h", rate: band(80, 150) },
  { id: "Q11", group: "quality", name: "Receipt coverage (expenses > $75)", source: "Attachable ÷ transactions", thresholds: ">70% / 30–70% / <30%", effect: "Proposal note", rate: bandLow(70, 30) },
  { id: "Q12", group: "quality", name: "Bank-feed “For Review” backlog", source: "Not available via API", thresholds: "—", effect: "Asked on call" },
  // Structure
  { id: "S1", group: "structure", name: "Multi-currency (% foreign txns)", source: "Preferences + txn currency", thresholds: "off / <10% / ≥10%", effect: "×1.15 if ≥10%", rate: (v) => (Number(v) === 0 ? "green" : Number(v) < 10 ? "amber" : "red") },
  { id: "S2", group: "structure", name: "Tracking dimensions in use", source: "Preferences + tagging rate", thresholds: "0 / 1 / 2+", effect: "×1.10 per dimension", rate: band(0, 1) },
  { id: "S3", group: "structure", name: "Entities", source: "Due-to / due-from accounts", thresholds: "1 / 2+", effect: "Consolidation service", rate: band(1, 1) },
  { id: "S4", group: "structure", name: "Inventory", source: "Inventory Asset account, items", thresholds: "no / yes", effect: "Inventory service", rate: flagRed },
  { id: "S5", group: "structure", name: "Sales-tax jurisdictions", source: "Tax agencies", thresholds: "0 / 1–2 / 3+", effect: "Sales-tax service", rate: band(0, 2) },
  { id: "S6", group: "structure", name: "Payment processors / e-commerce", source: "Clearing accounts, processor vendors", thresholds: "0 / 1 / 2+", effect: "Clearing reconciliation", rate: band(0, 1) },
  { id: "S7", group: "structure", name: "Deferred revenue", source: "Deferred revenue accounts with activity", thresholds: "no / yes", effect: "+2 h close", rate: flagRed },
  { id: "S8", group: "structure", name: "Fixed-asset & loan schedules", source: "FA accounts, LT liabilities", thresholds: "0 / 1–3 / >3", effect: "+30 min / schedule", rate: band(0, 3) },
  { id: "S9", group: "structure", name: "Accrual basis", source: "Preferences + AR/AP usage", thresholds: "cash / accrual", effect: "×1.10 if accrual", rate: flagAmber },
  { id: "S10", group: "structure", name: "Industry", source: "AI-inferred, analyst confirms", thresholds: "—", effect: "Industry factor" },
  // Backlog
  { id: "B1", group: "backlog", name: "Months behind (last clean month)", source: "All accounts reconciled and Q3 ≈ 0", thresholds: "≤1 / 2–3 / >3", effect: "Catch-up months", rate: band(1, 3) },
  { id: "B2", group: "backlog", name: "Books closed through", source: "Closing date in preferences", thresholds: "current FY / prior FY / never", effect: "Flag" },
];

export const SIGNAL_BY_ID = Object.fromEntries(SIGNALS.map((s) => [s.id, s])) as Record<string, SignalDef>;

export const GROUP_LABELS: Record<SignalGroup, string> = {
  volume: "Volume",
  quality: "Books quality",
  structure: "Structure",
  backlog: "Backlog",
};

export interface RatedSignal extends SignalDef {
  value: SignalValue;
  rag: Rag | null; // null = informational
}

export function rateSignals(values: SignalValue[]): RatedSignal[] {
  const byId = new Map(values.map((v) => [v.id, v]));
  return SIGNALS.map((def) => {
    const value =
      byId.get(def.id) ??
      ({ id: def.id, value: null, display: "—", evidence: "Not computed", available: false } as SignalValue);
    let rag: Rag | null = null;
    if (!value.available) rag = "unknown";
    else if (def.rate && value.value !== null) rag = def.rate(value.value);
    return { ...def, value, rag };
  });
}

// ── Summary scores ──────────────────────────────────────────────────────────

export type ComplexityTier = "Simple" | "Standard" | "Complex" | "Highly complex";

/** Structure points: amber = 1, red = 2. 0–2 Simple · 3–5 Standard · 6–9 Complex · 10+ Highly complex. */
export function complexityTier(rated: RatedSignal[]): { tier: ComplexityTier; points: number } {
  const points = rated
    .filter((s) => s.group === "structure")
    .reduce((acc, s) => acc + (s.rag === "red" ? 2 : s.rag === "amber" ? 1 : 0), 0);
  const tier: ComplexityTier =
    points <= 2 ? "Simple" : points <= 5 ? "Standard" : points <= 9 ? "Complex" : "Highly complex";
  return { tier, points };
}

/** 100 − 3 per amber − 8 per red across quality + backlog signals. */
export function booksHealth(rated: RatedSignal[]): { score: number; label: string } {
  const relevant = rated.filter((s) => s.group === "quality" || s.group === "backlog");
  const penalty = relevant.reduce((acc, s) => acc + (s.rag === "red" ? 8 : s.rag === "amber" ? 3 : 0), 0);
  const score = Math.max(0, 100 - penalty);
  const label = score >= 80 ? "Healthy" : score >= 60 ? "Fair" : score >= 40 ? "Needs attention" : "Poor";
  return { score, label };
}

export function ragCounts(rated: RatedSignal[]) {
  return rated.reduce(
    (acc, s) => {
      if (s.rag) acc[s.rag] += 1;
      return acc;
    },
    { green: 0, amber: 0, red: 0, unknown: 0 } as Record<Rag, number>,
  );
}

// ── Volume sizing ───────────────────────────────────────────────────────────

export function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export interface Sizing {
  avg6: number;
  p90_12: number;
  sized: number;
  basis: "average" | "peak";
}

/** Sized monthly volume = max(avg of last 6 months, 0.85 × p90 of last 12 months). */
export function sizeVolume(series: number[]): Sizing {
  const last6 = series.slice(-6);
  const last12 = series.slice(-12);
  const avg6 = last6.reduce((a, b) => a + b, 0) / Math.max(1, last6.length);
  const p90_12 = percentile(last12, 90);
  const peak = 0.85 * p90_12;
  const sized = Math.round(Math.max(avg6, peak));
  return { avg6: Math.round(avg6), p90_12: Math.round(p90_12), sized, basis: peak > avg6 ? "peak" : "average" };
}

export function volumeSeries(volumes: MonthlyVolume[], key: keyof Omit<MonthlyVolume, "month">) {
  return volumes.map((v) => v[key]);
}
