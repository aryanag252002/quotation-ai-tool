/**
 * Simulated ledger + call for prospects added during a demo.
 *
 * In production these shapes come from the connector, the analysis engine and the transcript
 * extractor. Here they are generated deterministically from the intake form (industry, size,
 * books condition), so every new prospect walks the same flow as Brightside with its own numbers.
 */
import { DEFAULT_PRICING_CONFIG } from "@/lib/config/defaults";
import { sizeVolume } from "@/lib/engine/analysis";
import { quotePackage, requiredServiceIds } from "@/lib/engine/pricing";
import { date, int, monthLabel, monthName, PLATFORM_LABEL, SYSTEM_LABEL, usd } from "@/lib/format";
import { tenant, users } from "@/lib/data/mock/pipeline";
import type {
  ActivityItem,
  BriefAnswer,
  BriefQuestion,
  CapabilityGap,
  Contradiction,
  CurrentProvider,
  CustomDeal,
  DealWorkspaceData,
  DemoCondition,
  DemoSize,
  Finding,
  Financials,
  Industry,
  LedgerAccount,
  LedgerSystem,
  PackageId,
  Rag,
  Requirement,
  ScopeLine,
  SignalValue,
  SyncEntity,
  TranscriptSegment,
  WorkloadDrivers,
} from "@/lib/types";

// ── Profiles ────────────────────────────────────────────────────────────────

const SIZE: Record<DemoSize, {
  txns: number; bank: number; card: number; invoices: number; bills: number; jes: number;
  employees: number; customers: number; vendors: number; coaBase: number; schedules: number;
  avgTicket: number; avgInvoice: number;
}> = {
  small: { txns: 220, bank: 1, card: 1, invoices: 18, bills: 28, jes: 4, employees: 7, customers: 60, vendors: 70, coaBase: 55, schedules: 1, avgTicket: 140, avgInvoice: 900 },
  medium: { txns: 620, bank: 3, card: 2, invoices: 60, bills: 90, jes: 14, employees: 20, customers: 150, vendors: 210, coaBase: 75, schedules: 3, avgTicket: 160, avgInvoice: 1100 },
  large: { txns: 1450, bank: 5, card: 3, invoices: 170, bills: 240, jes: 32, employees: 65, customers: 420, vendors: 520, coaBase: 95, schedules: 5, avgTicket: 210, avgInvoice: 1600 },
};

const CONDITION: Record<DemoCondition, {
  behind: number; suspensePct: number; undeposited: number; duplicates: number; staleArPct: number;
  staleApShare: number; obe: boolean; coaExtra: number; attach: number; uncleared: number;
  negative: number; unapplied: number; backlog: number;
}> = {
  clean: { behind: 0, suspensePct: 0, undeposited: 0, duplicates: 2, staleArPct: 6, staleApShare: 0, obe: false, coaExtra: 0, attach: 84, uncleared: 5, negative: 0, unapplied: 2, backlog: 0 },
  behind: { behind: 4, suspensePct: 0.7, undeposited: 14, duplicates: 9, staleArPct: 14, staleApShare: 0.08, obe: true, coaExtra: 40, attach: 58, uncleared: 28, negative: 0, unapplied: 6, backlog: 1 },
  messy: { behind: 9, suspensePct: 2.8, undeposited: 46, duplicates: 27, staleArPct: 31, staleApShare: 0.2, obe: true, coaExtra: 105, attach: 24, uncleared: 86, negative: 2, unapplied: 19, backlog: 2 },
};

/** Calendar-month seasonality shape (index 0 = January), scaled by `strength`. */
type Season = { shape: number[]; strength: number };
const FLAT: Season = { shape: Array(12).fill(0), strength: 0 };

const INDUSTRY: Record<Industry, {
  does: string;
  processors: string[];
  deferred: string | null;
  dims: (s: DemoSize) => { count: number; label: string };
  salesTax: { state: string; freq: "monthly" | "quarterly" }[];
  inventory: (s: DemoSize) => boolean;
  season: Season;
  /** Typical gross margin; null where there is no cost of sales. */
  grossMargin: number | null;
}> = {
  ecommerce: {
    does: "sells products online and through retail partners",
    processors: ["Shopify Payments", "Stripe"],
    deferred: "Deferred Revenue – Subscriptions",
    dims: () => ({ count: 1, label: "sales channel" }),
    salesTax: [{ state: "WA", freq: "monthly" }, { state: "CA", freq: "quarterly" }, { state: "TX", freq: "quarterly" }],
    inventory: (s) => s === "large",
    season: { shape: [-0.3, -0.25, 0, 0, 0, 0, 0, 0, 0, 0.1, 0.5, 1], strength: 0.35 },
    grossMargin: 0.46,
  },
  construction: {
    does: "runs residential and commercial projects",
    processors: [],
    deferred: null,
    dims: () => ({ count: 1, label: "job" }),
    salesTax: [{ state: "CO", freq: "monthly" }],
    inventory: () => false,
    season: { shape: [-0.4, -0.4, -0.1, 0.2, 0.4, 0.8, 1, 0.8, 0.4, 0.1, -0.2, -0.4], strength: 0.25 },
    grossMargin: 0.24,
  },
  nonprofit: {
    does: "runs community programs funded by grants and donations",
    processors: ["PayPal"],
    deferred: "Deferred Grant Revenue",
    dims: () => ({ count: 2, label: "program and funding source" }),
    salesTax: [],
    inventory: () => false,
    season: { shape: [0, 0, 0, 0, 0, 0, -0.2, -0.2, 0, 0, 0.3, 1], strength: 0.4 },
    grossMargin: null,
  },
  professional_services: {
    does: "delivers project and retainer work for business clients",
    processors: ["Stripe"],
    deferred: "Client Retainers (Unearned Revenue)",
    dims: (s) => (s === "small" ? { count: 0, label: "service line" } : { count: 1, label: "service line" }),
    salesTax: [],
    inventory: () => false,
    season: { shape: [0, 0, 0, 0, 0, 0, -0.4, -0.6, 0, 0, 0, -0.3], strength: 0.15 },
    grossMargin: 0.62,
  },
  healthcare: {
    does: "runs outpatient clinics",
    processors: ["Square"],
    deferred: null,
    dims: (s) => (s === "small" ? { count: 0, label: "location" } : { count: 1, label: "location" }),
    salesTax: [],
    inventory: () => false,
    season: FLAT,
    grossMargin: 0.58,
  },
  real_estate: {
    does: "manages residential and commercial properties",
    processors: [],
    deferred: "Prepaid Rent",
    dims: () => ({ count: 1, label: "property" }),
    salesTax: [],
    inventory: () => false,
    season: FLAT,
    grossMargin: 0.52,
  },
  logistics: {
    does: "moves freight for regional shippers",
    processors: [],
    deferred: null,
    dims: (s) => (s === "large" ? { count: 1, label: "terminal" } : { count: 0, label: "terminal" }),
    salesTax: [{ state: "TN", freq: "monthly" }],
    inventory: () => false,
    season: { shape: [-0.2, -0.2, 0, 0, 0, 0, 0, 0, 0.2, 0.5, 1, 0.6], strength: 0.2 },
    grossMargin: 0.21,
  },
  other: {
    does: "serves local and regional customers",
    processors: ["Stripe"],
    deferred: null,
    dims: () => ({ count: 0, label: "class" }),
    salesTax: [{ state: "CA", freq: "quarterly" }],
    inventory: () => false,
    season: FLAT,
    grossMargin: 0.4,
  },
};

const PAYROLL_PROVIDERS = ["Gusto", "ADP", "Paychex", "Rippling"];
const BANKS = ["Chase", "Bank of America", "Wells Fargo", "US Bank", "PNC"];
const BANK_ROLES = ["Operating", "Payroll", "Savings", "Reserve", "Tax"];
const CARDS = ["Amex Business", "Chase Ink", "Capital One Spark"];
const BOOKKEEPING_FIRMS = ["Pinecrest Bookkeeping", "Harborline Accounting", "Northgate Books & Tax", "Meridian Ledger Partners", "Bluestone Bookkeeping"];

const EXTERNAL_ID_LABEL: Record<LedgerSystem, string> = {
  qbo: "Company ID (realmId)",
  xero: "Tenant ID",
  zoho: "Organization ID",
  sage: "Company ID",
  netsuite: "Account ID",
  upload: "Files received",
};
export const externalIdLabel = (s: LedgerSystem) => EXTERNAL_ID_LABEL[s];

/** Portal question whose answer, when numeric, replaces the ledger-derived current spend. */
export const PORTAL_SPEND_QUESTION = "What do you pay for bookkeeping today (per month)?";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Small deterministic PRNG (mulberry32 over a string hash). */
function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    between: (lo: number, hi: number) => Math.round(lo + next() * (hi - lo)),
    jitter: (n: number, pct: number) => n * (1 + (next() * 2 - 1) * pct),
    pick: <T,>(arr: T[]) => arr[Math.floor(next() * arr.length)],
  };
}

const addMinutes = (iso: string, m: number) => new Date(new Date(iso).getTime() + m * 60_000).toISOString();
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const round50 = (n: number) => Math.max(50, Math.round(n / 50) * 50);
const listJoin = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

/** "Acme Widgets LLC" → "Acme Widgets". */
export function shortName(name: string) {
  return name.replace(/[,.]?\s+(LLC|L\.L\.C\.|Inc\.?|Ltd\.?|Limited|Corp\.?|Corporation|Co\.?|PLLC|LLP|PC)$/i, "").trim() || name;
}

/** 24 month keys ("2026-09"), ending with the last full month before `iso`. */
function monthWindow(iso: string) {
  const d = new Date(iso);
  return Array.from({ length: 24 }, (_, i) => {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 24 + i, 1));
    return m.toISOString().slice(0, 7);
  });
}

function monthsBefore(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 - n, 1)).toISOString().slice(0, 7);
}

// ── Generator ───────────────────────────────────────────────────────────────

export function generateWorkspace(deal: CustomDeal): DealWorkspaceData {
  const r = rng(deal.id);
  const { prospect, system, profile, progress } = deal;
  const S = SIZE[profile.size];
  const C = CONDITION[profile.condition];
  const I = INDUSTRY[prospect.industry];
  const short = shortName(prospect.name);
  const contact = prospect.contactName;
  const analyst = users.find((u) => u.id === deal.ownerId)?.name ?? users[0].name;
  const sysLabel = SYSTEM_LABEL[system];
  const isUpload = system === "upload";

  // Structure
  const processors = I.processors;
  const dims = I.dims(profile.size);
  const taxes = profile.size === "large" ? I.salesTax : I.salesTax.slice(0, 2);
  const hasInventory = I.inventory(profile.size);
  const deferred = profile.size === "small" && prospect.industry !== "ecommerce" ? null : I.deferred;
  const extraEntities = profile.size === "large" ? 1 : 0;
  const foreignPct = profile.size === "large" && (prospect.industry === "ecommerce" || prospect.industry === "logistics") ? 12 : 0;
  const accrual = !(profile.size === "small" && profile.condition === "clean" && ["professional_services", "healthcare", "other"].includes(prospect.industry));
  const payrollProvider = r.pick(PAYROLL_PROVIDERS);
  const statedEmployees = Number(deal.portalAnswers?.find((a) => a.q === "Number of employees")?.a.replace(/[^0-9]/g, ""));
  const employees = statedEmployees > 0 ? statedEmployees : Math.round(r.jitter(S.employees, 0.25));
  const payrollRuns = 2;

  // Monthly series
  const months = monthWindow(deal.createdAt);
  const asOf = months.at(-1)!;
  const growth = r.between(6, 24) / 100;
  const raw = months.map((ym, i) => {
    const cal = Number(ym.slice(5)) - 1;
    const level = 1 / (1 + growth) + (i / 23) * (1 - 1 / (1 + growth));
    const season = 1 + I.season.strength * I.season.shape[cal];
    return level * season * r.jitter(1, 0.04);
  });
  const scaleTo = (target: number, damp = 1) => {
    const last6 = sum(raw.slice(-6)) / 6;
    return raw.map((v) => Math.max(1, Math.round(target * (1 + (v / last6 - 1) * damp))));
  };
  const bankCard = scaleTo(r.jitter(S.txns, 0.1));
  const invoices = scaleTo(r.jitter(S.invoices, 0.12), 0.5);
  const bills = scaleTo(r.jitter(S.bills, 0.12), 0.4);
  const journals = scaleTo(S.jes + r.between(-1, 2), 0.3);
  const volumes = months.map((month, i) => ({ month, bankCard: bankCard[i], invoices: invoices[i], bills: bills[i], journals: journals[i] }));

  const sizing = sizeVolume(bankCard);
  const last12 = sum(bankCard.slice(-12));
  const prior12 = sum(bankCard.slice(0, 12));
  const yoy = Math.round(((last12 - prior12) / prior12) * 100);
  const seasonality = Math.round((sizing.p90_12 / (last12 / 12)) * 100) / 100;
  const peakIdx = bankCard.slice(-12).indexOf(Math.max(...bankCard.slice(-12)));
  const peakMonth = monthName(months[12 + peakIdx]).split(" ")[0];
  const peak = Math.max(...bankCard.slice(-12));
  const avg6 = (xs: number[]) => Math.round(sum(xs.slice(-6)) / 6);

  // Books quality
  const lastRec = monthsBefore(asOf, C.behind);
  const opexYear = sizing.sized * S.avgTicket * 12 * 0.7;
  const suspenseDollars = Math.round((opexYear * C.suspensePct) / 100);
  const suspenseTxns = Math.round(suspenseDollars / 85);
  const arTotal = Math.round(avg6(invoices) * S.avgInvoice * 1.2);
  const arStale = Math.round((arTotal * C.staleArPct) / 100);
  const staleAr = Math.round(avg6(invoices) * 1.2 * (C.staleArPct / 100));
  const staleAp = Math.round(avg6(bills) * C.staleApShare);
  const overdueCustomers = Math.max(1, Math.round((S.customers * C.staleArPct) / 100 * 0.4));
  const coa = S.coaBase + C.coaExtra + r.between(-4, 6);
  const coaRag: Rag = coa <= 80 ? "green" : coa <= 150 ? "amber" : "red";
  const undeposited = C.undeposited ? r.between(C.undeposited - 3, C.undeposited + 3) : 0;
  const duplicates = r.between(Math.max(0, C.duplicates - 2), C.duplicates + 2);
  const accounts = S.bank + S.card;
  const customers = Math.round(r.jitter(S.customers, 0.15));
  const vendors = Math.round(r.jitter(S.vendors, 0.15));
  const vendors1099 = Math.round(vendors * 0.11);
  const obe = C.obe ? Math.round(r.jitter(4800, 0.6) * 100) / 100 : 0;
  const feedVisible = system === "xero" || system === "zoho";
  const backlogMonths = C.backlog;

  // ── Financial statements (as reported) ───────────────────────────────────
  const gm = I.grossMargin;
  const netMargin = (profile.condition === "messy" ? r.between(1, 6) : r.between(5, 13)) / 100;
  const revenue = opexYear / ((gm ?? 1) - netMargin);
  const cogs = gm ? revenue * (1 - gm) : 0;
  const revGrowth = yoy + r.between(-3, 3);
  const thousands = (n: number) => usd(Math.round(n / 1000) * 1000);
  const [asOfY, asOfM] = asOf.split("-").map(Number);
  const nonprofit = prospect.industry === "nonprofit";
  const cash = (revenue * r.between(35, 95)) / 1000;
  const financials: Financials = {
    pl: {
      period: `12 months to ${monthName(asOf)}`,
      figures: [
        { label: nonprofit ? "Revenue & support" : "Revenue", value: thousands(revenue), hint: `${revGrowth >= 0 ? "+" : ""}${revGrowth}% vs prior 12 months` },
        gm
          ? { label: "Gross margin", value: `${(gm * 100).toFixed(1)}%`, hint: `Cost of sales ${thousands(cogs)}` }
          : { label: "Gross margin", value: "n/a", hint: "No cost of sales" },
        {
          label: "Operating expenses",
          value: thousands(opexYear),
          hint: suspenseDollars ? `Incl. ${usd(suspenseDollars)} uncategorized` : "All categorised",
          tone: C.suspensePct >= 1 ? "danger" : C.suspensePct > 0 ? "warning" : undefined,
        },
        { label: nonprofit ? "Change in net assets" : "Net income", value: thousands(revenue * netMargin), hint: `${(netMargin * 100).toFixed(1)}% margin, as reported` },
      ],
    },
    bs: {
      asOf: date(new Date(Date.UTC(asOfY, asOfM, 0)).toISOString()),
      figures: [
        {
          label: "Cash & bank",
          value: thousands(cash),
          hint: C.behind > 1 ? `Unreconciled since ${monthName(lastRec)}` : "Reconciled to statements",
          tone: C.behind > 3 ? "danger" : C.behind > 1 ? "warning" : undefined,
        },
        accrual
          ? { label: "Accounts receivable", value: usd(arTotal), hint: `${C.staleArPct}% over 90 days`, tone: C.staleArPct > 25 ? "danger" : C.staleArPct >= 10 ? "warning" : undefined }
          : { label: "Accounts receivable", value: "Not tracked", hint: "Cash basis" },
        accrual
          ? { label: "Accounts payable", value: thousands(((cogs + opexYear) / 12) * (0.3 + r.next() * 0.2)), hint: `${avg6(bills)} bills a month`, tone: C.staleApShare >= 0.2 ? "warning" : undefined }
          : { label: "Accounts payable", value: "Not tracked", hint: "Cash basis" },
        {
          label: nonprofit ? "Net assets" : "Equity",
          value: thousands((revenue * r.between(10, 22)) / 100),
          hint: obe ? `Incl. ${usd(obe)} Opening Balance Equity` : "No Opening Balance Equity",
          tone: obe ? "warning" : undefined,
        },
      ],
    },
    caveat:
      C.behind > 1
        ? `As reported in ${isUpload ? "the exports" : sysLabel}. Nothing has been reconciled since ${monthName(lastRec)}, so these figures will move once the cleanup is done.`
        : null,
  };

  // Accounts to reconcile (bank, card, processor clearing, loans)
  const last4 = () => String(r.between(1000, 9999));
  const bankName = r.pick(BANKS);
  const bankShares = Array.from({ length: S.bank }, (_, i) => (i === 0 ? 0.7 : 0.3 / (S.bank - 1)));
  const recThrough = C.behind ? lastRec : asOf;
  const ledgerAccounts: LedgerAccount[] = [
    ...Array.from({ length: S.bank }, (_, i) => ({
      id: `b${i + 1}`,
      name: `${bankName} ${BANK_ROLES[i]} ••${last4()}`,
      kind: "bank" as const,
      lastReconciled: recThrough,
      balance: Math.round(cash * bankShares[i]),
    })),
    ...Array.from({ length: S.card }, (_, i) => ({
      id: `c${i + 1}`,
      name: `${CARDS[i % CARDS.length]} ••${last4()}`,
      kind: "card" as const,
      lastReconciled: recThrough,
      balance: -Math.round(r.jitter(S.avgTicket * 40, 0.4)),
    })),
    ...processors.map((p, i) => ({
      id: `p${i + 1}`,
      name: `${p.replace(" Payments", "")} Clearing`,
      kind: "clearing" as const,
      lastReconciled: profile.condition === "clean" ? asOf : null,
      balance: Math.round(r.jitter(S.avgTicket * 20, 0.5)),
    })),
    ...(S.schedules >= 3
      ? [{ id: "l1", name: `Equipment Loan – ${bankName}`, kind: "loan" as const, lastReconciled: recThrough, balance: -Math.round(r.jitter(revenue * 0.04, 0.3)) }]
      : []),
  ];

  // Previous / current bookkeeping provider, found as vendor payments in the ledger
  const firm = r.pick(BOOKKEEPING_FIRMS);
  const firmStillPaid = profile.condition !== "messy";
  const portalSpend = Number(deal.portalAnswers?.find((a) => a.q === PORTAL_SPEND_QUESTION)?.a.replace(/[^0-9.]/g, ""));

  // ── Snapshot ──────────────────────────────────────────────────────────────
  const connectedAt = progress.connectedAt ?? deal.createdAt;
  const analysedAt = progress.analysedAt ?? connectedAt;
  const entityRows: [string, number][] = isUpload
    ? [
        ["Trial balance, 24 month-ends (.xlsx)", 24],
        ["General ledger detail (.csv)", sum(bankCard) + sum(invoices) + sum(bills) + sum(journals)],
        [`Bank & card statements, ${accounts} accounts (.pdf)`, accounts * 24],
        ["AR / AP aging (.xlsx)", 2],
      ]
    : system === "qbo"
      ? [
          ["Company info & preferences", 2],
          ["Chart of accounts", coa],
          ["Customers / vendors", customers + vendors],
          ["Purchases (expenses, checks, card)", Math.round(sum(bankCard) * 0.76)],
          ["Deposits & transfers", Math.round(sum(bankCard) * 0.24)],
          ["Invoices & sales receipts", sum(invoices)],
          ["Customer payments", Math.round(sum(invoices) * 1.3)],
          ["Bills & bill payments", Math.round(sum(bills) * 1.8)],
          ["Journal entries", sum(journals)],
          ["Trial balance (24 month-ends)", 24],
          ["General ledger (monthly chunks)", 24],
          [`Reconciliation status (TransactionList × ${accounts})`, accounts * 3],
          ["AR / AP aging, P&L, balance sheet", 4],
        ]
      : [
          ["Organisation & settings", 2],
          ["Chart of accounts", coa],
          ["Contacts", customers + vendors],
          ["Bank transactions (spend & receive)", sum(bankCard)],
          ["Invoices", sum(invoices)],
          ["Customer payments", Math.round(sum(invoices) * 1.3)],
          ["Bills & bill payments", Math.round(sum(bills) * 1.8)],
          ["Manual journals", sum(journals)],
          ["Trial balance (24 month-ends)", 24],
          ["Bank reconciliation status", accounts],
          ["Aged receivables / payables, P&L, balance sheet", 4],
        ];
  const entities: SyncEntity[] = entityRows.map(([entity, records]) => ({
    entity,
    records,
    apiCalls: isUpload ? 0 : records > 1000 ? Math.ceil(records / 1000) : Math.max(1, Math.min(records, 24)),
    status: "done",
  }));

  const gaps: CapabilityGap[] = [];
  if (isUpload) {
    gaps.push({ id: "g0", label: "File exports only", impact: "No live connection: figures come from the exports supplied, so confidence is lower.", resolution: "assumption" });
  }
  if (!feedVisible) {
    gaps.push({ id: "g1", label: "Bank-feed “For Review” items", impact: `Items waiting in the bank feed aren’t visible ${isUpload ? "in file exports" : `through the ${sysLabel} API`}.`, resolution: "pre_call_question" });
  }
  gaps.push({ id: "g2", label: `Payroll detail (${payrollProvider})`, impact: "Only payroll journal totals are in the ledger; headcount is estimated.", resolution: "pre_call_question" });
  gaps.push({ id: "g3", label: "Audit log", impact: "Who changed what is not available; not needed for pricing.", resolution: "assumption" });

  const recEvidence: Record<LedgerSystem, string> = {
    qbo: "TransactionList report, cleared=Reconciled",
    xero: "IsReconciled flag on bank transactions",
    zoho: "Reconciliation status on bank transactions",
    sage: "Bank reconciliation history",
    netsuite: "Reconciled flag on bank register lines",
    upload: "Clr column in the general ledger export",
  };

  // ── Signals ───────────────────────────────────────────────────────────────
  const tagged = r.between(72, 94);
  const signals: SignalValue[] = [
    { id: "V1", value: sizing.sized, display: `${int(sizing.sized)} / mo`, evidence: `Avg last 6 months = ${int(sizing.avg6)}; 0.85 × p90 of last 12 months = ${int(0.85 * sizing.p90_12)}. Sized on the ${sizing.basis}.`, available: true },
    { id: "V2", value: S.bank, display: String(S.bank), evidence: `${S.bank} bank account${S.bank > 1 ? "s" : ""} with activity in the window`, available: true },
    { id: "V3", value: S.card, display: String(S.card), evidence: `${S.card} credit-card account${S.card > 1 ? "s" : ""} with activity in the window`, available: true },
    { id: "V4", value: avg6(invoices), display: `${avg6(invoices)} / mo`, evidence: "Invoices and sales receipts, avg last 6 months", available: true },
    { id: "V5", value: Math.round(avg6(invoices) * 1.3), display: `${Math.round(avg6(invoices) * 1.3)} / mo`, evidence: "Customer payments, avg last 6 months", available: true },
    { id: "V6", value: avg6(bills), display: `${avg6(bills)} / mo`, evidence: "Vendor bills, avg last 6 months", available: true },
    { id: "V7", value: Math.round(avg6(bills) * 0.8), display: `${Math.round(avg6(bills) * 0.8)} / mo`, evidence: "Bill payments, avg last 6 months", available: true },
    { id: "V8", value: payrollRuns, display: `${payrollRuns} runs · ~${employees} staff`, evidence: `Semi-monthly ${payrollProvider} payroll journals; headcount confirmed on call`, available: true },
    { id: "V9", value: avg6(journals), display: `${avg6(journals)} / mo`, evidence: "Manual journal entries, avg last 6 months", available: true },
    { id: "V10", value: customers + vendors, display: `${customers} customers · ${vendors} vendors`, evidence: "Distinct counterparties with activity in the window", available: true },
    { id: "V11", value: vendors1099, display: String(vendors1099), evidence: "Vendors flagged 1099 or non-corporate payees > $600", available: true },
    { id: "V12", value: seasonality, display: `${seasonality}×`, evidence: `p90 of last 12 months (${int(sizing.p90_12)}) ÷ 12-month average`, available: true },
    { id: "V13", value: yoy, display: `${yoy >= 0 ? "+" : ""}${yoy}% YoY`, evidence: `Last 12 months ${int(last12)} txns vs prior 12 months ${int(prior12)}`, available: true },
    { id: "Q1", value: C.behind, display: C.behind ? `${C.behind} months` : "Current", evidence: `All ${accounts} bank and card accounts last reconciled ${monthName(lastRec)} (${recEvidence[system]})`, available: true },
    { id: "Q2", value: C.uncleared, display: `${C.uncleared} items`, evidence: "Uncleared bank items older than 60 days", available: true },
    { id: "Q3", value: C.suspensePct, display: C.suspensePct ? `${usd(suspenseDollars)} · ${suspenseTxns} txns (${C.suspensePct}%)` : "None", evidence: `Uncategorized / Ask My Accountant balances vs ${usd(opexYear)} operating expenses (last 12 months)`, available: true },
    { id: "Q4", value: undeposited, display: undeposited ? `${undeposited} items` : "None", evidence: "Undeposited Funds items older than 30 days", available: true },
    { id: "Q5", value: obe !== 0, display: obe ? usd(obe) : "$0", evidence: "Opening Balance Equity on the latest balance sheet", available: true },
    { id: "Q6", value: C.negative, display: C.negative ? `${C.negative} accounts` : "None", evidence: C.negative ? "Negative month-end balances in a bank account and accounts payable" : "No negative bank, AR, AP or asset balances in any month-end", available: true },
    { id: "Q7", value: C.staleArPct, display: `${C.staleArPct}% of AR`, evidence: `${usd(arStale)} of ${usd(arTotal)} AR older than 90 days`, available: true },
    { id: "Q8", value: duplicates, display: `${duplicates} pairs`, evidence: "Same amount + payee within ±3 days", available: true },
    { id: "Q9", value: C.unapplied, display: String(C.unapplied), evidence: "Unapplied customer payments and vendor credits", available: true },
    { id: "Q10", value: coa, display: `${coa} accounts`, evidence: coaRag === "green" ? "Lean chart of accounts" : `Including ${Math.round(coa / 12)} near-duplicate names`, available: true },
    { id: "Q11", value: C.attach, display: `${C.attach}%`, evidence: "Attachments on expense transactions over $75", available: true },
    feedVisible
      ? { id: "Q12", value: backlogMonths * sizing.sized, display: backlogMonths ? `${int(backlogMonths * sizing.sized)} lines` : "None", evidence: `Unreconciled statement lines from the ${sysLabel} bank feed`, available: true }
      : { id: "Q12", value: null, display: "Not available", evidence: `${isUpload ? "File exports don’t" : `The ${sysLabel} API doesn’t`} include bank-feed “For Review” items → asked on call`, available: false },
    { id: "S1", value: foreignPct, display: foreignPct ? `${foreignPct}% foreign` : "Off", evidence: foreignPct ? "Multi-currency on; CAD and EUR transactions" : "Multi-currency disabled", available: true },
    { id: "S2", value: dims.count, display: dims.count ? `${dims.count} (${dims.label}, ${tagged}% tagged)` : "None", evidence: dims.count ? `Tracking by ${dims.label}` : "No classes, locations or departments in use", available: true },
    { id: "S3", value: 1 + extraEntities, display: `${1 + extraEntities} ${extraEntities ? "entities" : "entity"}`, evidence: extraEntities ? "Due-to / due-from accounts with a holding company" : "No due-to / due-from accounts", available: true },
    { id: "S4", value: hasInventory, display: hasInventory ? "Yes" : "No", evidence: hasInventory ? "Inventory Asset account and inventory items in use" : "No inventory items or Inventory Asset account", available: true },
    { id: "S5", value: taxes.length, display: taxes.length ? taxes.map((t) => `${t.state} (${t.freq})`).join(" · ") : "None", evidence: "Tax agencies with filings in the window", available: true },
    { id: "S6", value: processors.length, display: processors.length ? processors.join(" · ") : "None", evidence: processors.length ? `Clearing accounts for ${listJoin(processors)}` : "No processor clearing accounts", available: true },
    { id: "S7", value: !!deferred, display: deferred ? "Yes" : "No", evidence: deferred ? `${deferred}, monthly manual JE` : "No deferred revenue accounts with activity", available: true },
    { id: "S8", value: S.schedules, display: `${S.schedules} schedule${S.schedules > 1 ? "s" : ""}`, evidence: "Fixed assets, loans and prepaids with monthly activity", available: true },
    { id: "S9", value: accrual, display: accrual ? "Accrual" : "Cash", evidence: accrual ? "Accrual basis; AR and AP in use" : "Cash basis in preferences", available: true },
    { id: "S10", value: null, display: prospect.industryLabel, evidence: `AI-inferred from chart of accounts and top vendors (${r.between(84, 96)}%); confirmed at intake`, available: true },
    { id: "B1", value: C.behind, display: C.behind ? `${monthLabel(lastRec)} (${C.behind} months behind)` : `${monthLabel(asOf)} (current)`, evidence: "Latest month with all accounts reconciled and suspense ≈ 0", available: true },
    { id: "B2", value: null, display: `31 Dec ${Number(asOf.slice(0, 4)) - 1}`, evidence: "Closing date set in preferences", available: true },
  ];

  // ── Findings ──────────────────────────────────────────────────────────────
  const findings: Finding[] = [];
  const add = (f: Omit<Finding, "id" | "status">) => findings.push({ ...f, id: `f${findings.length + 1}`, status: "proposed" });
  if (C.behind > 1) add({ statement: "bs", severity: C.behind > 3 ? "high" : "medium", title: `Books not reconciled since ${monthName(lastRec)}`, detail: `All ${accounts} bank and card accounts were last reconciled in ${monthName(lastRec)}, leaving ${C.behind} months (~${int(sum(bankCard.slice(-C.behind)))} transactions) unreconciled.`, signalIds: ["Q1", "B1"] });
  if (extraEntities) add({ statement: "bs", severity: "high", title: "Two entities with intercompany activity", detail: "Due-to / due-from balances with a holding company mean consolidation and intercompany eliminations each month.", signalIds: ["S3"] });
  if (C.suspensePct >= 1) add({ statement: "pl", severity: "high", title: `${usd(suspenseDollars)} in Uncategorized / Ask My Accountant`, detail: `${suspenseTxns} transactions (${C.suspensePct}% of operating expenses) sit in suspense-type accounts, above the 1% threshold.`, signalIds: ["Q3"] });
  else if (C.suspensePct > 0) add({ statement: "pl", severity: "medium", title: `${usd(suspenseDollars)} in suspense accounts`, detail: `${suspenseTxns} transactions need recategorising.`, signalIds: ["Q3"] });
  if (processors.length) add({ statement: "bs", severity: "medium", title: `${processors.length === 1 ? "A payment processor needs" : `${processors.length} payment processors need`} clearing reconciliation`, detail: `${listJoin(processors)} payouts, fees and refunds flow through clearing accounts that must be reconciled monthly.`, signalIds: ["S6"] });
  if (hasInventory) add({ statement: "bs", severity: "medium", title: "Inventory is tracked in the books", detail: "Inventory asset and COGS need monthly true-ups against stock counts.", signalIds: ["S4"] });
  if (deferred) add({ statement: "pl", severity: "medium", title: "Deferred revenue is maintained manually", detail: `${deferred} is updated with a monthly manual journal entry.`, signalIds: ["S7", "V9"] });
  if (C.staleArPct >= 10) add({ statement: "bs", severity: C.staleArPct > 25 ? "medium" : "low", title: `${C.staleArPct}% of receivables are over 90 days`, detail: `${usd(arStale)} of ${usd(arTotal)} AR is older than 90 days.`, signalIds: ["Q7"] });
  if (undeposited) add({ statement: "bs", severity: undeposited > 20 ? "medium" : "low", title: `${undeposited} undeposited-funds items older than 30 days`, detail: "Customer receipts were never matched to bank deposits.", signalIds: ["Q4"] });
  if (duplicates > 5) add({ statement: "pl", severity: duplicates > 20 ? "medium" : "low", title: `${duplicates} possible duplicate transactions`, detail: "Same amount and payee within three days; each needs checking.", signalIds: ["Q8"] });
  if (coaRag === "red") add({ statement: "pl", severity: "low", title: `Chart of accounts has ${coa} accounts`, detail: "Many near-duplicate accounts; a restructure will make reporting reliable.", signalIds: ["Q10"] });
  if (obe) add({ statement: "bs", severity: "low", title: `Opening Balance Equity holds ${usd(obe)}`, detail: "Usually caused by opening balances entered without an offset; needs a one-off correction.", signalIds: ["Q5"] });
  if (yoy > 10) add({ statement: "pl", severity: "low", title: `Volume grew ${yoy}% year on year`, detail: "The quote includes a volume-band clause.", signalIds: ["V13"] });
  if (profile.condition === "clean") add({ statement: "bs", severity: "low", title: "Books are reconciled and current", detail: `Reconciliations are complete through ${monthName(asOf)} and suspense accounts are clear, so monthly service can start straight away.`, signalIds: ["Q1", "Q3"] });
  const order = { high: 0, medium: 1, low: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);

  // ── Brief ─────────────────────────────────────────────────────────────────
  const conditionSentence =
    profile.condition === "clean"
      ? "The books are in good shape: reconciliations are current and suspense accounts are clear, so monthly service can start straight away."
      : profile.condition === "behind"
        ? `Bookkeeping has slipped: nothing has been reconciled since ${monthName(lastRec)}, so a short cleanup project is needed before monthly service starts.`
        : `The books need significant work: nothing has been reconciled since ${monthName(lastRec)} and ${usd(suspenseDollars)} sits in suspense accounts, so a cleanup project is needed before monthly service starts.`;
  const briefSummary = `${short} ${I.does}. Books are on ${isUpload ? "file exports" : sysLabel}, ${accrual ? "accrual" : "cash"} basis${dims.count ? `, with tracking by ${dims.label}` : ""}. The ledger shows about ${int(sizing.sized)} bank and card transactions a month${seasonality > 1.15 ? ` with a peak near ${int(peak)} in ${peakMonth}` : ""}. ${conditionSentence}`;

  const briefQuestions: BriefQuestion[] = [];
  const q = (id: string, question: string, why: string, signalId?: string) => briefQuestions.push({ id, question, why, signalId });
  if (!feedVisible) q("q_feed", "Is anything sitting in the bank feed (“For Review”) that hasn’t been categorised yet?", isUpload ? "Not visible in file exports." : `Not available via the ${sysLabel} API.`, "Q12");
  if (C.behind > 1) q("q_behind", `Who has been doing the books since ${monthName(lastRec)}, and are bank statements available for the months since?`, `Nothing reconciled for ${C.behind} months.`, "Q1");
  if (processors.length) q("q_proc", `Are ${listJoin(processors)} your only payment processors? Any others (PayPal, Square, Amazon)?`, `${processors.length} clearing account${processors.length > 1 ? "s" : ""} found.`, "S6");
  q("q_fees", `What does ${firm} cover today, and what do you pay them each month?`, `Payments to ${firm} found in the ledger; sets the savings comparison.`);
  q("q_payroll", "Which payroll provider do you use, how often, and for how many employees?", "Paycheck detail is not in the ledger.", "V8");
  if (taxes.length) q("q_tax", "Which sales-tax returns do you file today, and who files them?", `${taxes.map((t) => t.state).join(" and ")} filings found.`, "S5");
  if (deferred) q("q_def", "How is deferred revenue calculated each month, and from which system?", "Manual journal entry each month.", "S7");
  if (hasInventory) q("q_inv", "How often do you count inventory, and how is cost of goods sold calculated?", "Inventory asset account in use.", "S4");
  if (extraEntities) q("q_ent", "Is the second entity on a separate file, and who books the intercompany charges?", "Due-to / due-from accounts found.", "S3");
  if (C.staleArPct >= 10) q("q_ar", "Do you want us to chase overdue customers, or keep that in-house?", `${C.staleArPct}% of AR is over 90 days.`, "Q7");
  q("q_rep", dims.count ? `What reporting do you need by ${dims.label}, and by which day each month?` : "What reporting do you need each month, and by which day?", dims.count ? `Tracking by ${dims.label} is set up.` : "Sets the close deadline and package.", dims.count ? "S2" : undefined);

  // ── Call (transcript + extraction) ────────────────────────────────────────
  const segs: TranscriptSegment[] = [];
  let clockSec = 0;
  const say = (side: "kpo" | "prospect", text: string) => {
    const id = `s${segs.length + 1}`;
    segs.push({ id, speaker: side === "kpo" ? analyst : contact, side, start: clockSec, text });
    clockSec += Math.round(text.length / 14) + r.between(18, 60);
    return id;
  };
  const kpo = (t: string) => say("kpo", t);
  const client = (t: string) => say("prospect", t);
  const answers: BriefAnswer[] = [];
  const answer = (questionId: string, a: string, segmentIds: string[]) => {
    if (briefQuestions.some((x) => x.id === questionId)) answers.push({ questionId, answer: a, segmentIds });
  };
  const requirements: Requirement[] = [];
  const req = (field: string, value: string, segmentIds: string[], confidence: Requirement["confidence"] = "high") =>
    requirements.push({ id: `r${requirements.length + 1}`, field, value, confidence, segmentIds });

  const wantsCollections = C.staleArPct > 25;
  const wantsPayroll = profile.size !== "small" && r.next() > 0.45;
  const wantsAp = avg6(bills) >= 20;
  const closeDay = profile.size === "large" ? 5 : 10;
  const needsCleanup = profile.condition !== "clean";

  kpo(`Thanks for joining. I’ve already been through your ${isUpload ? "exports" : sysLabel} data, so I’d like to use this time to confirm a few things and understand what you need from us.`);
  const sReason = client(
    profile.condition === "clean"
      ? `Great. ${firm} keeps the books tidy, but their fees keep going up as we grow and we want a proper monthly close.`
      : profile.condition === "behind"
        ? `Great. Honestly, the books have slipped over the last few months; ${firm} hasn’t kept up with reconciliations.`
        : `Great. To be honest, the books are a mess. We stopped using ${firm} in ${monthName(monthsBefore(asOf, C.behind - 1)).split(" ")[0]} and things have piled up since.`,
  );

  let sFeed: string;
  if (needsCleanup) {
    kpo(`That matches what we saw: all ${accounts} bank and card accounts were last reconciled in ${monthName(lastRec)}. Is anything sitting in the bank feed that hasn’t been categorised yet?`);
    sFeed = client(backlogMonths > 1 ? "Yes, the last couple of months are basically untouched in the bank feed." : "Yes, last month is mostly untouched in the bank feed. Everything before that is categorised.");
    answer("q_behind", "Nobody has reconciled since then; statements are available from the bank portals.", [sReason, sFeed]);
    answer("q_feed", backlogMonths > 1 ? "The last two months are uncategorised in the bank feed." : "Last month is uncategorised in the bank feed.", [sFeed]);
    req("Bank-feed backlog", `${backlogMonths} month${backlogMonths > 1 ? "s" : ""} not categorised (catch-up)`, [sFeed]);
  } else {
    kpo(`Your reconciliations are current through ${monthName(asOf)}, which is great. Is anything waiting in the bank feed?`);
    sFeed = client("No, we clear the bank feed every week.");
    answer("q_feed", "Nothing waiting; the feed is cleared weekly.", [sFeed]);
  }

  const estimate = profile.clientEstimate ?? round50(sizing.sized * (0.55 + r.next() * 0.15));
  const contradicts = Math.abs(estimate - sizing.sized) / sizing.sized > 0.15;
  kpo("How many transactions would you say you have in a month?");
  const sEstimate = client(`I’d guess around ${int(estimate)}?`);
  if (contradicts) {
    kpo(`The ledger actually shows about ${int(sizing.sized)} a month across bank and cards over the last six months${seasonality > 1.15 ? `, and it gets close to ${int(peak)} in ${peakMonth}` : ""}.`);
    client(estimate < sizing.sized ? "Oh, that’s more than I thought." : "Interesting, it feels busier than that day to day.");
  } else {
    kpo(`That lines up with the ledger: about ${int(sizing.sized)} a month over the last six months.`);
  }

  if (processors.length) {
    kpo(`On payments, I see ${listJoin(processors)}. Are those the only processors?`);
    const s = client(`Yes, ${processors.length > 1 ? "those are all of them" : "that’s the only one"}.`);
    answer("q_proc", `${listJoin(processors)} only; no other processors.`, [s]);
  }

  const sAp = client(
    wantsAp
      ? `The biggest time sink is bills: about ${avg6(bills)} a month from suppliers. We’d love you to take over bill pay.`
      : "We don’t have many bills, so we can keep paying those ourselves.",
  );
  if (wantsAp) req("Accounts payable", "Take over bill entry and payments", [sAp]);

  kpo("And on receivables, do you want us to handle invoicing and chasing overdue customers?");
  const sAr = client(
    wantsCollections
      ? "Yes, both. Collections have slipped and we have a lot of overdue invoices."
      : "Invoicing, yes. We’d rather keep chasing customers ourselves for now.",
  );
  req("Accounts receivable", wantsCollections ? "Invoicing and collections follow-up" : "Invoicing yes; collections stay with the client", [sAr]);
  answer("q_ar", wantsCollections ? "Yes, they want collections handled." : "Collections stay in-house.", [sAr]);

  kpo(`Does payroll run through ${payrollProvider}?`);
  const sPayroll = client(
    `Yes, semi-monthly for ${employees} people. ${wantsPayroll ? "We’d like you to take over payroll admin too." : "We’re happy to keep running payroll; you’d just record it."}`,
  );
  answer("q_payroll", `${payrollProvider}, semi-monthly, ${employees} employees.`, [sPayroll]);
  req("Payroll", `${payrollProvider}, semi-monthly, ${employees} employees; ${wantsPayroll ? "takeover wanted" : "client keeps running payroll"}`, [sPayroll], wantsPayroll ? "medium" : "high");

  if (taxes.length) {
    kpo(`On sales tax, we see filings for ${listJoin(taxes.map((t) => t.state))}.`);
    const s = client(`${listJoin(taxes.map((t) => `${t.state} ${t.freq}`))}. We file them ourselves today and would happily hand that over.`);
    answer("q_tax", `${taxes.map((t) => `${t.state} ${t.freq}`).join(", ")}; filed by the client today.`, [s]);
    req("Sales tax", `File ${taxes.map((t) => `${t.state} (${t.freq})`).join(" and ")}`, [s]);
  }

  if (deferred) {
    kpo(`I see a ${deferred} account. Who manages that?`);
    const s = client("We do a manual journal entry at month-end from a spreadsheet. It takes a few hours.");
    answer("q_def", "Manual month-end journal entry from a spreadsheet.", [s]);
  }

  if (hasInventory) {
    kpo("Inventory is in the books. How do you handle counts and cost of goods sold?");
    const s = client("We count monthly and true up COGS from a spreadsheet. We’d like help keeping that accurate.");
    answer("q_inv", "Monthly counts; COGS trued up from a spreadsheet.", [s]);
    req("Inventory", "Monthly inventory and COGS true-up", [s]);
  }

  if (extraEntities) {
    kpo("There are due-to and due-from accounts. Is there a second entity?");
    const s = client("Yes, a holding company on its own file. We need consolidated reporting across both.");
    answer("q_ent", "Holding company on a separate file; consolidated reporting needed.", [s]);
    req("Entities", "Two entities; consolidated monthly reporting", [s]);
  }

  const wantsMgmtReporting = profile.size !== "small" || dims.count > 0;
  const sRep = client(
    dims.count
      ? `We need a monthly reporting pack split by ${dims.label}${profile.size !== "small" ? " for our board" : ""}.`
      : wantsMgmtReporting
        ? "Our board wants a proper monthly reporting pack."
        : "A clean P&L and balance sheet each month is all we need for now.",
  );
  req("Reporting", dims.count ? `Monthly reporting pack by ${dims.label}` : wantsMgmtReporting ? "Monthly management reporting pack" : "Monthly P&L and balance sheet", [sRep]);
  const sTiming = client(`Ideally the close is done by day ${closeDay} each month${needsCleanup ? ", and we’d like the books cleaned up within the next couple of months" : ""}.`);
  answer("q_rep", `${dims.count ? `Pack by ${dims.label}` : wantsMgmtReporting ? "Monthly management pack" : "P&L and balance sheet"}, close by day ${closeDay}.`, [sRep, sTiming]);
  req("Close deadline", `Close complete by day ${closeDay}`, [sTiming]);
  if (needsCleanup) req("Cleanup deadline", "Books clean within about two months", [sTiming]);
  req("Decision maker", `${contact} (${prospect.contactTitle})`, [sReason], "medium");

  const contradictions: Contradiction[] = contradicts
    ? [{ id: "c1", topic: "Monthly transaction volume", clientSaid: `“Around ${int(estimate)}” a month`, dataShows: `${int(sizing.sized)} / month (sized)${seasonality > 1.15 ? `, peaking near ${int(peak)} in ${peakMonth}` : ""}`, segmentIds: [sEstimate], signalId: "V1", resolution: "data" }]
    : [];

  const openItems = [
    ...(C.behind > 1 ? [`Bank and card statements for ${monthName(monthsBefore(asOf, C.behind - 1))} to ${monthName(asOf)}`] : []),
    `Read-only access to ${payrollProvider} payroll registers`,
    ...(taxes.length ? [`Access to the ${taxes.map((t) => t.state).join(" and ")} sales-tax portals`] : []),
    ...(deferred ? ["The spreadsheet behind the deferred revenue entry"] : []),
    ...(hasInventory ? ["Your latest inventory count"] : []),
    ...(extraEntities ? ["Accountant access to the holding company’s books"] : []),
    ...(isUpload ? ["A general ledger export that includes the reconciliation (Clr) column"] : []),
    ...(wantsAp ? ["Your bill-approval rules and a list of recurring vendors"] : []),
  ];

  // ── Drivers ───────────────────────────────────────────────────────────────
  const salesTaxFilings = sum(taxes.map((t) => (t.freq === "monthly" ? 1 : 1 / 3)));
  const workloadDrivers: WorkloadDrivers = {
    bankCardTxns: sizing.sized,
    bankAccounts: S.bank,
    cardAccounts: S.card,
    invoices: avg6(invoices),
    customerPayments: Math.round(avg6(invoices) * 1.3),
    overdueCustomers,
    bills: avg6(bills),
    billPayments: Math.round(avg6(bills) * 0.8),
    paymentPlatforms: processors.length,
    payrollRuns,
    payrollEmployeeRuns: employees * payrollRuns,
    manualJEs: avg6(journals),
    closeSchedules: S.schedules,
    deferredRevenue: deferred ? 1 : 0,
    reportingDimensions: dims.count,
    salesTaxFilings,
    inventoryTxns: hasInventory ? Math.round(sizing.sized * 0.3) : 0,
    hasInventory: hasInventory ? 1 : 0,
    extraEntities,
    intercompany: extraEntities ? 1 : 0,
    vendors1099,
    accrualBasis: accrual,
    foreignTxnPct: foreignPct,
    industry: prospect.industry,
  };

  const cleanupDrivers = {
    unreconciledAccountMonths: accounts * C.behind,
    txnsInUnreconciledPeriods: C.behind ? sum(bankCard.slice(-C.behind)) : 0,
    uncategorizedTxns: suspenseTxns,
    duplicates,
    undepositedItems: undeposited,
    staleArApItems: staleAr + staleAp,
    obeNonZero: obe !== 0,
    coaStatus: coaRag,
    backlogMonths,
  };

  // ── Scope ─────────────────────────────────────────────────────────────────
  const scope: ScopeLine[] = [
    { serviceId: "bookkeeping", source: "data", rationale: `~${int(sizing.sized)} bank and card transactions a month`, confidence: "high", included: true, signalIds: ["V1"] },
    { serviceId: "reconciliation", source: "data", rationale: `${S.bank} bank + ${S.card} card account${accounts > 1 ? "s" : ""}`, confidence: "high", included: true, signalIds: ["V2", "V3"] },
  ];
  if (processors.length) scope.push({ serviceId: "clearing", source: "data", rationale: `${listJoin(processors)} clearing account${processors.length > 1 ? "s" : ""}`, confidence: "high", included: true, signalIds: ["S6"] });
  scope.push({ serviceId: "payroll_journal", source: "data", rationale: `Semi-monthly ${payrollProvider} payroll to record`, confidence: "high", included: true, signalIds: ["V8"] });
  if (taxes.length) scope.push({ serviceId: "sales_tax", source: "call", rationale: `${taxes.map((t) => `${t.state} ${t.freq}`).join(" + ")}; client wants to hand over filing`, confidence: "high", included: true, signalIds: ["S5"], segmentIds: requirements.find((x) => x.field === "Sales tax")?.segmentIds });
  if (hasInventory) scope.push({ serviceId: "inventory", source: "data", rationale: "Inventory asset and COGS in the books", confidence: "high", included: true, signalIds: ["S4"] });
  if (extraEntities) scope.push({ serviceId: "consolidation", source: "data", rationale: "Holding company with intercompany balances", confidence: "high", included: true, signalIds: ["S3"] });
  scope.push(
    wantsAp
      ? { serviceId: "accounts_payable", source: "call", rationale: `${avg6(bills)} bills / month; client wants bill pay handled`, confidence: "high", included: true, signalIds: ["V6", "V7"], segmentIds: [sAp] }
      : { serviceId: "accounts_payable", source: "call", rationale: "Few bills; client keeps paying them", confidence: "high", included: false, signalIds: ["V6"], segmentIds: [sAp] },
    { serviceId: "accounts_receivable", source: "call", rationale: `${avg6(invoices)} invoices / month; client wants invoicing handled`, confidence: "high", included: true, signalIds: ["V4", "V5"], segmentIds: [sAr] },
    { serviceId: "month_end_close", source: "data", rationale: `${accrual ? "Accrual basis" : "Cash basis"}${deferred ? ", deferred revenue" : ""}, ${S.schedules} schedule${S.schedules > 1 ? "s" : ""}, close by day ${closeDay}`, confidence: "high", included: accrual, signalIds: ["S7", "S8", "S9"], segmentIds: [sTiming] },
    { serviceId: "basic_financials", source: "analyst", rationale: "Standard monthly P&L and balance sheet", confidence: "high", included: true },
    { serviceId: "mgmt_reporting", source: "call", rationale: wantsMgmtReporting ? "Client wants a monthly reporting pack" : "Not requested", confidence: "high", included: wantsMgmtReporting, segmentIds: [sRep] },
    { serviceId: "advanced_reporting", source: "call", rationale: dims.count ? `Split by ${dims.label}` : "No tracking dimensions in use", confidence: dims.count ? "medium" : "high", included: dims.count > 0, signalIds: ["S2"], segmentIds: [sRep] },
    { serviceId: "payroll", source: "call", rationale: wantsPayroll ? `Wants ${payrollProvider} admin handed over` : "Client keeps running payroll", confidence: "medium", included: wantsPayroll, segmentIds: [sPayroll] },
    { serviceId: "year_end_1099", source: "data", rationale: `${vendors1099} vendors likely need 1099s`, confidence: "medium", included: vendors1099 > 0, signalIds: ["V11"] },
    { serviceId: "collections", source: "call", rationale: wantsCollections ? `${overdueCustomers} overdue customers; client wants collections handled` : "Client keeps collections in-house", confidence: "high", included: wantsCollections, signalIds: ["Q7"], segmentIds: [sAr] },
  );

  const recommendedPackage: PackageId =
    wantsPayroll || wantsCollections || closeDay === 5 || dims.count > 1 ? "premium" : wantsAp || wantsMgmtReporting ? "growth" : "essential";

  // ── Current spend (asked last on the call, compared with our fee on the Pricing step) ──
  const required = new Set(requiredServiceIds(workloadDrivers));
  const inScope = new Set(scope.filter((l) => l.included || required.has(l.serviceId)).map((l) => l.serviceId));
  const ourFee = quotePackage(DEFAULT_PRICING_CONFIG, recommendedPackage, workloadDrivers, inScope).monthlyFee;
  const ledgerFee = round50(ourFee * (1.2 + r.next() * 0.35));
  const currentFee = portalSpend > 0 ? portalSpend : ledgerFee;
  const firmServices = ["bookkeeping", "reconciliation", "basic_financials", ...(profile.condition === "clean" && accrual ? ["month_end_close"] : [])];
  const lastPaid = firmStillPaid ? asOf : monthsBefore(asOf, C.behind);
  kpo(`One last thing. The ledger shows payments to ${firm}${firmStillPaid ? "" : ` until ${monthName(lastPaid).split(" ")[0]}`}. What ${firmStillPaid ? "do they cover" : "did they cover"} for that?`);
  const sFees = client(
    `About ${usd(currentFee)} a month, and that’s just bookkeeping${profile.condition === "clean" ? ", reconciliations and the close" : " and reconciliations"}.${wantsAp ? " We still pay the bills ourselves." : ""}${taxes.length ? " We file sales tax ourselves too." : ""}`,
  );
  answer("q_fees", `${usd(currentFee)} a month to ${firm} for bookkeeping and reconciliations.`, [sFees]);
  req("Current spend", `${usd(currentFee)} / month to ${firm}`, [sFees]);
  const currentProvider: CurrentProvider = {
    name: firm,
    monthlyFee: currentFee,
    services: firmServices,
    source: portalSpend > 0 ? "portal" : "ledger",
    evidence:
      portalSpend > 0
        ? `Stated in the prospect portal (${usd(portalSpend)} / month)`
        : `12 payments of ${usd(ledgerFee)} to ${firm} (Professional Fees: Bookkeeping), ${monthName(monthsBefore(lastPaid, 11))} – ${monthName(lastPaid)}`,
    segmentIds: [sFees],
  };
  kpo(`That’s really helpful. We’ll send a proposal with ${needsCleanup ? "a cleanup project and " : ""}a few package options by tomorrow.`);

  // ── Confidence, questionnaire, activity ───────────────────────────────────
  const reasons = [
    ...(isUpload ? ["Analysis is from file exports only, with no live connection"] : []),
    "Payroll headcount comes from the call, not the ledger",
    ...(!feedVisible && needsCleanup ? ["Bank-feed backlog confirmed verbally (not visible via API)"] : []),
  ];
  const confidence = { level: isUpload ? ("low" as const) : ("medium" as const), reasons };

  const questionnaire = deal.portalAnswers?.length
    ? deal.portalAnswers
    : [
        { q: "What services are you looking for?", a: wantsAp ? "Bookkeeping, bill pay, monthly reporting" : "Bookkeeping and monthly reporting" },
        { q: "What’s prompting the change?", a: profile.condition === "clean" ? "We’re growing and want a proper finance function." : "We’ve fallen behind on the books." },
        { q: "Other tools you use", a: [...processors, payrollProvider].join(", ") },
        { q: "Number of employees", a: String(employees) },
        { q: "Ideal start date", a: "Next month" },
      ];

  const pathLabel = { accountant_user: "accountant user", prospect_oauth: "via prospect portal", file_upload: "file upload" }[deal.accessPath];
  const platform = progress.callPlatform ?? "zoom";
  const durationMinutes = Math.max(20, Math.ceil(clockSec / 60) + 14);
  const callStartedAt = progress.callStartedAt ?? addMinutes(analysedAt, 60);
  const transcriptAt = progress.transcriptAt ?? addMinutes(callStartedAt, durationMinutes + 3);
  const activity: ActivityItem[] = [
    { at: deal.createdAt, label: "Prospect created", actor: analyst, minutes: 2 },
    { at: addMinutes(deal.createdAt, 0.2), label: deal.accessPath === "accountant_user" ? `Accountant-invite instructions sent to ${contact}` : `Portal link sent to ${contact}`, actor: "QuoteIQ" },
  ];
  if (progress.connectedAt) {
    activity.push({ at: progress.connectedAt, label: isUpload ? "Exports uploaded" : `${sysLabel} connected (${pathLabel})`, actor: progress.connectedBy ?? contact });
  }
  if (progress.analysedAt) {
    activity.push(
      { at: progress.analysedAt, label: "Snapshot pulled · trial balance tied 24 / 24 months", actor: "QuoteIQ" },
      { at: addMinutes(progress.analysedAt, 0.1), label: "Analysis complete · pre-call brief drafted", actor: "QuoteIQ" },
    );
  }
  if (progress.transcriptAt) {
    activity.push(
      { at: callStartedAt, label: `Consultation on ${PLATFORM_LABEL[platform]} (${durationMinutes} min)`, actor: analyst },
      { at: transcriptAt, label: `Transcript received via ${PLATFORM_LABEL[platform]} webhook`, actor: "QuoteIQ" },
      { at: addMinutes(transcriptAt, 2), label: "Requirements extracted · scope and pricing drafted", actor: "QuoteIQ" },
    );
  }

  return {
    volumes,
    snapshot: {
      connection: {
        system,
        accessPath: deal.accessPath,
        companyName: prospect.name,
        externalId: isUpload ? `${entities.length} files` : String(9_000_000_000_000_000 + Math.floor(r.next() * 999_999_999_999)),
        connectedBy: progress.connectedBy ?? contact,
        connectedAt,
        windowMonths: 24,
        readOnlyEnforced: !isUpload,
      },
      syncedAt: analysedAt,
      durationMinutes: Math.max(1, Math.round((new Date(analysedAt).getTime() - new Date(connectedAt).getTime()) / 60_000)),
      entities,
      tieOut: { monthsChecked: 24, monthsTied: 24, maxVariance: 0 },
      gaps,
    },
    signals,
    findings,
    financials,
    accounts: ledgerAccounts,
    currentProvider,
    briefSummary,
    briefQuestions,
    meeting: {
      platform,
      title: `${short} × ${tenant.shortName}: discovery call`,
      startedAt: callStartedAt,
      durationMinutes,
      attendees: [`${analyst} (${tenant.shortName})`, `${contact} (${short}, ${prospect.contactTitle})`],
      consentLogged: true,
      transcriptReceivedAt: transcriptAt,
      extractionSeconds: r.between(95, 160),
    },
    transcript: segs,
    requirements,
    briefAnswers: answers,
    contradictions,
    openItems,
    questionnaire,
    workloadDrivers,
    clientStatedTxns: estimate,
    cleanupDrivers,
    scope,
    activity,
    recommendedPackage,
    payrollProvider,
    confidence,
    cleanup: {
      summary: needsCleanup
        ? `Bring the books current before monthly service starts: reconcile ${cleanupDrivers.unreconciledAccountMonths} account-months${suspenseTxns ? ", recategorise suspense items" : ""}${undeposited ? ", clear undeposited funds" : ""}${backlogMonths ? ` and catch up ${backlogMonths} month${backlogMonths > 1 ? "s" : ""} of bank-feed backlog` : ""}.`
        : "Tidy up a small number of open items before monthly service starts.",
      deadline: "within about two months of signature",
    },
  };
}
