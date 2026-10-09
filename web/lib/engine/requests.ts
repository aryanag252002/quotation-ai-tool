/**
 * What we need from the client to reconcile the books, derived from the analysis.
 * Deterministic: every request points at the account or signal that triggered it.
 */
import { monthName, usd } from "@/lib/format";
import type { DealWorkspaceData, DocumentRequest, LedgerAccount, RequestCategory } from "@/lib/types";

export const REQUEST_CATEGORIES: Record<RequestCategory, string> = {
  statements: "Bank, card and loan statements",
  processors: "Payment processors",
  transactions: "Transactions to explain",
  payroll_tax: "Payroll and sales tax",
  balances: "Balances to confirm",
  other: "Other",
};

const shortMonth = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
};

/** "2026-02" + 3 → "2026-05". */
export function addMonths(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}

export function monthsBetween(from: string, to: string) {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

/** Months an account is behind the latest month-end (never reconciled = whole 12-month look-back). */
export function monthsBehind(a: LedgerAccount, asOf: string) {
  return a.lastReconciled ? Math.max(0, monthsBetween(a.lastReconciled, asOf)) : 12;
}

const period = (from: string, to: string) => (from === to ? shortMonth(to) : `${shortMonth(from)} – ${shortMonth(to)}`);

export function buildDocumentRequests(data: DealWorkspaceData): DocumentRequest[] {
  const asOf = data.volumes.at(-1)!.month;
  const sig = (id: string) => data.signals.find((s) => s.id === id);
  const c = data.cleanupDrivers;
  const w = data.workloadDrivers;
  const out: DocumentRequest[] = [];
  const add = (r: Omit<DocumentRequest, "received">) => out.push({ ...r, received: false });

  // Statements for every account we reconcile
  let earliestGap: string | null = null;
  for (const a of data.accounts) {
    const behind = monthsBehind(a, asOf);
    const from = a.lastReconciled ? addMonths(a.lastReconciled, 1) : addMonths(asOf, -11);
    if (behind > 0 && (!earliestGap || from < earliestGap) && a.kind !== "clearing") earliestGap = from;
    if (a.kind === "clearing") {
      add({
        id: `stmt-${a.id}`,
        category: "processors",
        title: `${a.name.replace(" Clearing", "")} payout reports`,
        detail:
          behind > 0
            ? `Payouts, fees and refunds by day. ${a.lastReconciled ? `Clearing account not reconciled since ${monthName(a.lastReconciled)}` : "Clearing account has never been reconciled"} (${usd(a.balance)} balance).`
            : "Monthly payout report, so we can reconcile the clearing account each close.",
        period: behind > 0 ? period(from, asOf) : shortMonth(asOf),
        months: Math.max(1, behind),
        priority: behind > 0 ? "cleanup" : "monthly",
        signalIds: ["S6"],
      });
      continue;
    }
    add({
      id: `stmt-${a.id}`,
      category: "statements",
      title: `${a.name} statements`,
      detail:
        behind > 0
          ? a.kind === "loan"
            ? `To reconcile the ${usd(Math.abs(a.balance))} loan balance and split interest from principal.`
            : `Not reconciled since ${a.lastReconciled ? monthName(a.lastReconciled) : "the account was opened"}; one statement per month to reconcile ${behind} month${behind > 1 ? "s" : ""}.`
          : `Reconciled through ${monthName(asOf)}. Latest statement only, to confirm the opening balance for our first close.`,
      period: behind > 0 ? period(from, asOf) : shortMonth(asOf),
      months: Math.max(1, behind),
      priority: behind > 0 ? "cleanup" : "monthly",
      signalIds: a.kind === "loan" ? ["S8"] : ["Q1", "B1"],
    });
  }

  // Transactions the books can't explain on their own
  if (c.uncategorizedTxns > 0) {
    const dollars = sig("Q3")?.display.split(" · ")[0] ?? "";
    add({
      id: "txn-uncategorized",
      category: "transactions",
      title: `Receipts or notes for ${c.uncategorizedTxns} uncategorized transactions`,
      detail: `${dollars} sits in Uncategorized / Ask My Accountant. We’ll send the list; a one-line note per item is enough.`,
      priority: "cleanup",
      signalIds: ["Q3"],
    });
  }
  if (c.duplicates > 5) {
    add({
      id: "txn-duplicates",
      category: "transactions",
      title: `Confirm ${c.duplicates} possible duplicate payments`,
      detail: "Same amount and payee within three days. Tell us which were genuinely paid twice.",
      priority: "cleanup",
      signalIds: ["Q8"],
    });
  }
  if (c.undepositedItems > 0) {
    add({
      id: "txn-undeposited",
      category: "transactions",
      title: `Remittance details for ${c.undepositedItems} undeposited receipts`,
      detail: "Customer payments recorded but never matched to a bank deposit. Deposit slips or remittance emails help us match them.",
      priority: "cleanup",
      signalIds: ["Q4"],
    });
  }
  if (c.backlogMonths > 0) {
    add({
      id: "txn-feed",
      category: "transactions",
      title: "Bank-feed items waiting in “For Review”",
      detail: `${c.backlogMonths} month${c.backlogMonths > 1 ? "s" : ""} of bank-feed items haven’t been categorised. Confirm we can work through them, or tell us about any you’ve handled outside the ledger.`,
      period: period(addMonths(asOf, 1 - c.backlogMonths), asOf),
      priority: "cleanup",
      signalIds: ["Q12"],
    });
  }

  // Payroll and sales tax
  if (w.payrollRuns > 0 && data.payrollProvider) {
    const from = earliestGap ?? asOf;
    add({
      id: "pay-registers",
      category: "payroll_tax",
      title: `${data.payrollProvider} payroll registers`,
      detail: "Gross-to-net by pay run, to reconcile payroll liabilities and the payroll bank account.",
      period: period(from, asOf),
      priority: earliestGap ? "cleanup" : "monthly",
      signalIds: ["V8"],
    });
  }
  if (w.salesTaxFilings > 0) {
    add({
      id: "tax-returns",
      category: "payroll_tax",
      title: "Sales-tax returns filed",
      detail: `Copies of returns and payment confirmations (${sig("S5")?.display ?? "all jurisdictions"}), to reconcile sales tax payable.`,
      period: period(addMonths(asOf, -11), asOf),
      priority: "cleanup",
      signalIds: ["S5"],
    });
  }

  // Balances only the client can confirm
  if (c.staleArApItems > 0) {
    add({
      id: "bal-ar",
      category: "balances",
      title: "Which overdue invoices are still collectible",
      detail: `${sig("Q7")?.evidence ?? "Receivables older than 90 days"}. We’ll send the list to mark collect / write off.`,
      priority: "cleanup",
      signalIds: ["Q7"],
    });
  }
  if (w.bills > 0) {
    add({
      id: "bal-vendors",
      category: "balances",
      title: "Statements from your top 5 vendors",
      detail: "To confirm accounts payable balances and catch missing bills.",
      period: shortMonth(asOf),
      priority: earliestGap ? "cleanup" : "monthly",
      signalIds: ["V6"],
    });
  }
  if (c.obeNonZero) {
    add({
      id: "bal-obe",
      category: "balances",
      title: "Prior-year tax return or closing balance sheet",
      detail: `To clear ${sig("Q5")?.display ?? "the"} Opening Balance Equity against the correct opening balances.`,
      priority: "cleanup",
      signalIds: ["Q5"],
    });
  }
  if (w.deferredRevenue > 0) {
    add({
      id: "bal-deferred",
      category: "balances",
      title: "Deferred revenue schedule",
      detail: "The spreadsheet or system export behind the monthly deferred revenue entry.",
      priority: "monthly",
      signalIds: ["S7"],
    });
  }

  return out;
}
