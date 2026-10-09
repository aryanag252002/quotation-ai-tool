/**
 * Demo prospect: Brightside Coffee Roasters LLC (fictional).
 * Shapes match what the analysis + transcript services will return from the backend.
 */
import { sizeVolume } from "@/lib/engine/analysis";
import type {
  BriefAnswer,
  BriefQuestion,
  CleanupDrivers,
  Contradiction,
  CurrentProvider,
  Finding,
  Financials,
  Meeting,
  MonthlyVolume,
  Requirement,
  ScopeLine,
  SignalValue,
  Snapshot,
  TranscriptSegment,
  WorkloadDrivers,
} from "@/lib/types";

const months = Array.from({ length: 24 }, (_, i) => {
  const d = new Date(Date.UTC(2024, 9 + i, 1)); // Oct 2024 → Sep 2026
  return d.toISOString().slice(0, 7);
});

const bankCard = [505, 640, 690, 470, 480, 500, 515, 530, 525, 540, 548, 560, 575, 735, 790, 540, 560, 590, 610, 625, 640, 655, 630, 660];
const invoices = [44, 47, 52, 41, 43, 46, 48, 50, 49, 51, 52, 54, 55, 58, 61, 54, 56, 58, 60, 61, 62, 63, 61, 65];
const bills = [70, 78, 82, 69, 71, 72, 74, 76, 77, 79, 80, 82, 84, 91, 95, 86, 87, 88, 90, 91, 92, 94, 90, 95];
const journals = [14, 16, 19, 13, 14, 14, 15, 15, 16, 16, 17, 17, 17, 19, 22, 16, 17, 17, 18, 18, 18, 19, 17, 18];

export const volumes: MonthlyVolume[] = months.map((month, i) => ({
  month,
  bankCard: bankCard[i],
  invoices: invoices[i],
  bills: bills[i],
  journals: journals[i],
}));

const sizing = sizeVolume(bankCard);
const last12 = bankCard.slice(-12).reduce((a, b) => a + b, 0);
const prior12 = bankCard.slice(0, 12).reduce((a, b) => a + b, 0);
const yoyGrowth = Math.round(((last12 - prior12) / prior12) * 100);
const seasonality = Math.round((sizing.p90_12 / (last12 / 12)) * 100) / 100;

export const snapshot: Snapshot = {
  connection: {
    system: "qbo",
    accessPath: "accountant_user",
    companyName: "Brightside Coffee Roasters LLC",
    externalId: "9341453120827364",
    connectedBy: "Priya Sharma",
    connectedAt: "2026-10-05T09:12:00Z",
    windowMonths: 24,
    readOnlyEnforced: true,
  },
  syncedAt: "2026-10-05T09:21:00Z",
  durationMinutes: 9,
  entities: [
    { entity: "Company info & preferences", records: 2, apiCalls: 2, status: "done" },
    { entity: "Chart of accounts", records: 132, apiCalls: 1, status: "done" },
    { entity: "Customers / vendors", records: 358, apiCalls: 2, status: "done" },
    { entity: "Purchases (expenses, checks, card)", records: 9812, apiCalls: 10, status: "done" },
    { entity: "Deposits & transfers", records: 3050, apiCalls: 4, status: "done" },
    { entity: "Invoices & sales receipts", records: 1394, apiCalls: 2, status: "done" },
    { entity: "Customer payments", records: 1804, apiCalls: 2, status: "done" },
    { entity: "Bills & bill payments", records: 3531, apiCalls: 4, status: "done" },
    { entity: "Journal entries", records: 402, apiCalls: 1, status: "done" },
    { entity: "Trial balance (24 month-ends)", records: 24, apiCalls: 24, status: "done" },
    { entity: "General ledger (monthly chunks)", records: 24, apiCalls: 24, status: "done" },
    { entity: "Reconciliation status (TransactionList × 3)", records: 15, apiCalls: 15, status: "done" },
    { entity: "AR / AP aging, P&L, balance sheet", records: 4, apiCalls: 4, status: "done" },
  ],
  tieOut: { monthsChecked: 24, monthsTied: 24, maxVariance: 0 },
  gaps: [
    {
      id: "g1",
      label: "Bank-feed “For Review” items",
      impact: "Uncategorised items waiting in the bank feed aren’t exposed by the QuickBooks API.",
      resolution: "pre_call_question",
    },
    {
      id: "g2",
      label: "Payroll paycheck detail (Gusto)",
      impact: "Only payroll journal totals are in the ledger; headcount is estimated.",
      resolution: "pre_call_question",
    },
    {
      id: "g3",
      label: "Audit log",
      impact: "Who changed what is not available via API; not needed for pricing.",
      resolution: "assumption",
    },
  ],
};

export const signals: SignalValue[] = [
  { id: "V1", value: sizing.sized, display: `${sizing.sized} / mo`, evidence: `Avg last 6 months = ${sizing.avg6}; 0.85 × p90 of last 12 months = ${Math.round(0.85 * sizing.p90_12)}. Sized on the ${sizing.basis}.`, available: true },
  { id: "V2", value: 3, display: "3", evidence: "Chase Operating ••4411, Chase Payroll ••7720, Mercury Savings ••0193", available: true },
  { id: "V3", value: 2, display: "2", evidence: "Amex Business Gold ••1007, Chase Ink ••3382", available: true },
  { id: "V4", value: 62, display: "62 / mo", evidence: "Invoice + SalesReceipt, avg last 6 months", available: true },
  { id: "V5", value: 84, display: "84 / mo", evidence: "Payment, avg last 6 months", available: true },
  { id: "V6", value: 92, display: "92 / mo", evidence: "Bill, avg last 6 months", available: true },
  { id: "V7", value: 71, display: "71 / mo", evidence: "BillPayment, avg last 6 months", available: true },
  { id: "V8", value: 2, display: "2 runs · ~18 staff", evidence: "Semi-monthly Gusto payroll JEs; headcount confirmed on call", available: true },
  { id: "V9", value: 18, display: "18 / mo", evidence: "JournalEntry, avg last 6 months (accruals, deferred revenue, payroll)", available: true },
  { id: "V10", value: 358, display: "146 customers · 212 vendors", evidence: "Distinct counterparties with activity in the window", available: true },
  { id: "V11", value: 24, display: "24", evidence: "Vendors flagged 1099 or non-corporate payees > $600", available: true },
  { id: "V12", value: seasonality, display: `${seasonality}×`, evidence: `p90 of last 12 months (${sizing.p90_12}) ÷ 12-month average`, available: true },
  { id: "V13", value: yoyGrowth, display: `+${yoyGrowth}% YoY`, evidence: `Last 12 months ${last12.toLocaleString()} txns vs prior 12 months ${prior12.toLocaleString()}`, available: true },
  { id: "Q1", value: 7, display: "7 months", evidence: "All 5 bank and card accounts last reconciled on 28 Feb 2026", available: true },
  { id: "Q2", value: 34, display: "34 items", evidence: "TransactionList cleared=UnCleared older than 60 days", available: true },
  { id: "Q3", value: 2.1, display: "$18,420 · 212 txns (2.1%)", evidence: "Uncategorized Expense $11,302 · Ask My Accountant $7,118 vs $877k operating expenses (last 12 months)", available: true },
  { id: "Q4", value: 38, display: "38 items · $14,960", evidence: "Undeposited Funds items older than 30 days", available: true },
  { id: "Q5", value: true, display: "$6,215.40", evidence: "Opening Balance Equity on the 30 Sep 2026 balance sheet", available: true },
  { id: "Q6", value: 0, display: "None", evidence: "No negative bank, AR, AP or asset balances in any month-end", available: true },
  { id: "Q7", value: 18, display: "18% of AR", evidence: "$11,940 of $66,330 AR older than 90 days (9 customers)", available: true },
  { id: "Q8", value: 14, display: "14 pairs", evidence: "Same amount + payee within ±3 days", available: true },
  { id: "Q9", value: 4, display: "4", evidence: "Unapplied customer payments (3) and vendor credits (1)", available: true },
  { id: "Q10", value: 132, display: "132 accounts", evidence: "Including 11 near-duplicate names (e.g. “Shipping”, “Shipping & Freight”)", available: true },
  { id: "Q11", value: 72, display: "72%", evidence: "Attachments on expense transactions over $75", available: true },
  { id: "Q12", value: null, display: "Not available", evidence: "The QuickBooks API does not expose bank-feed “For Review” items → asked on call", available: false },
  { id: "S1", value: 0, display: "Off", evidence: "Multi-currency disabled in preferences", available: true },
  { id: "S2", value: 1, display: "Classes (81% tagged)", evidence: "Class tracking: Wholesale / Retail / Online", available: true },
  { id: "S3", value: 1, display: "1 entity", evidence: "No due-to / due-from accounts", available: true },
  { id: "S4", value: false, display: "Not in QuickBooks", evidence: "No inventory items or Inventory Asset account; COGS booked from bills", available: true },
  { id: "S5", value: 2, display: "WA (monthly) · CA (quarterly)", evidence: "Tax agencies with filings in the window", available: true },
  { id: "S6", value: 2, display: "Shopify Payments · Stripe", evidence: "Clearing accounts “Shopify Clearing” and “Stripe Clearing”", available: true },
  { id: "S7", value: true, display: "Yes · $9,870 balance", evidence: "Deferred Revenue – Subscriptions, monthly manual JE", available: true },
  { id: "S8", value: 3, display: "3 schedules", evidence: "Roasting equipment (FA), equipment loan, prepaid insurance", available: true },
  { id: "S9", value: true, display: "Accrual", evidence: "Accrual basis in preferences; AR and AP in use", available: true },
  { id: "S10", value: null, display: "E-commerce · food & beverage", evidence: "AI-inferred from chart of accounts and top vendors (92%); confirmed by analyst", available: true },
  { id: "B1", value: 7, display: "Feb 2026 (7 months behind)", evidence: "Latest month with all accounts reconciled and suspense ≈ 0", available: true },
  { id: "B2", value: null, display: "31 Dec 2025", evidence: "Closing date set in preferences", available: true },
];

export const findings: Finding[] = [
  // Profit & loss
  { id: "f2", statement: "pl", severity: "high", title: "$18,420 of expenses in Uncategorized / Ask My Accountant", detail: "212 transactions (2.1% of operating expenses) sit in suspense-type accounts, above the 1% threshold, so expense lines on the P&L are understated.", signalIds: ["Q3"], status: "proposed" },
  { id: "f8", statement: "pl", severity: "medium", title: "Gross margin swings because coffee is expensed when billed", detail: "There is no inventory in QuickBooks, so green coffee hits cost of goods sold when the importer bills, not when it is roasted and sold. Monthly gross margin moved between 52% and 63% this year.", signalIds: ["S4"], status: "proposed" },
  { id: "f4", statement: "pl", severity: "medium", title: "Subscription revenue is recognised with a manual journal", detail: "Gift-subscription revenue is released from a $9,870 deferred revenue balance with one manual entry a month, built from a Shopify export.", signalIds: ["S7", "V9"], status: "proposed" },
  { id: "f9", statement: "pl", severity: "low", title: "14 possible duplicate expenses", detail: "Same amount and payee within three days, mostly freight and packaging bills; each needs checking before the P&L is final.", signalIds: ["Q8"], status: "proposed" },
  { id: "f7", statement: "pl", severity: "low", title: "Revenue grew 15% year on year", detail: "Transaction volume grew with it. The quote includes a volume-band clause so the fee only moves if volume keeps rising.", signalIds: ["V13"], status: "proposed" },
  // Balance sheet
  { id: "f1", statement: "bs", severity: "high", title: "Cash not reconciled since February 2026", detail: "All 5 bank and card accounts were last reconciled on 28 Feb 2026, leaving 7 months (~4,410 transactions) unreconciled. The $142k cash balance can’t be relied on until this is done.", signalIds: ["Q1", "B1"], status: "proposed" },
  { id: "f3", statement: "bs", severity: "medium", title: "Shopify and Stripe clearing accounts are not reconciled", detail: "Payouts, fees and refunds flow through two clearing accounts that have never been reconciled to processor statements.", signalIds: ["S6"], status: "proposed" },
  { id: "f5", statement: "bs", severity: "medium", title: "$14,960 in undeposited funds older than 30 days", detail: "38 customer receipts were never matched to bank deposits, so cash and receivables are both overstated.", signalIds: ["Q4"], status: "proposed" },
  { id: "f10", statement: "bs", severity: "low", title: "18% of receivables are over 90 days", detail: "$11,940 of $66,330 AR is older than 90 days across 9 wholesale cafés. Some may need writing off.", signalIds: ["Q7"], status: "proposed" },
  { id: "f6", statement: "bs", severity: "low", title: "Opening Balance Equity holds $6,215", detail: "Usually caused by opening balances entered without an offset; needs a one-off correction.", signalIds: ["Q5"], status: "proposed" },
];

export const financials: Financials = {
  pl: {
    period: "12 months to September 2026",
    figures: [
      { label: "Revenue", value: "$1,742,000", hint: "+15% vs prior 12 months" },
      { label: "Gross margin", value: "57.9%", hint: "COGS $734k · swings 52–63% a month", tone: "warning" },
      { label: "Operating expenses", value: "$877,000", hint: "Incl. $18,420 uncategorized", tone: "danger" },
      { label: "Net income", value: "$131,000", hint: "7.5% margin, as reported" },
    ],
  },
  bs: {
    asOf: "Sep 30, 2026",
    figures: [
      { label: "Cash & bank", value: "$142,380", hint: "Unreconciled since February 2026", tone: "danger" },
      { label: "Accounts receivable", value: "$66,330", hint: "18% over 90 days", tone: "warning" },
      { label: "Accounts payable", value: "$48,210", hint: "92 bills a month" },
      { label: "Equity", value: "$214,560", hint: "Incl. $6,215 Opening Balance Equity", tone: "warning" },
    ],
  },
  caveat: "As reported in QuickBooks. Nothing has been reconciled since February, so these figures will move once the cleanup is done.",
};

/** Found in the ledger (vendor payments), then confirmed on the call. */
export const currentProvider: CurrentProvider = {
  name: "Summit Bookkeeping Co.",
  monthlyFee: 3200,
  services: ["bookkeeping", "reconciliation", "basic_financials"],
  source: "ledger",
  evidence: "12 payments of $3,200 to Summit Bookkeeping Co. (Professional Fees: Bookkeeping), Mar 2025 – Feb 2026",
  segmentIds: ["s26"],
};

export const briefSummary =
  "Brightside is a specialty coffee roaster selling wholesale to cafés (Stripe-invoiced) and direct to consumers through Shopify, including gift subscriptions. Books are on QuickBooks Online, accrual basis, with class tracking by channel. The ledger shows about 640 bank and card transactions a month with a holiday peak near 790. Bookkeeping has slipped: nothing has been reconciled since February 2026 and $18k sits in suspense accounts, so a cleanup project is needed before monthly service starts.";

export const briefQuestions: BriefQuestion[] = [
  { id: "b1", question: "Is anything sitting in the bank feed (“For Review”) that hasn’t been categorised yet?", why: "Not available via the QuickBooks API.", signalId: "Q12" },
  { id: "b2", question: "Who has been doing the books since February, and are bank statements available for March–September?", why: "Nothing reconciled for 7 months.", signalId: "Q1" },
  { id: "b3", question: "How is subscription deferred revenue calculated each month, and from which system?", why: "Manual JE each month.", signalId: "S7" },
  { id: "b4", question: "Is Stripe used only for wholesale invoices? Any other processors (Square, PayPal, Amazon)?", why: "Two clearing accounts found.", signalId: "S6" },
  { id: "b5", question: "Which payroll provider do you use, how often, and for how many employees?", why: "Paycheck detail not in the ledger.", signalId: "V8" },
  { id: "b6", question: "Which sales-tax returns do you file today, and who files them?", why: "WA and CA filings found.", signalId: "S5" },
  { id: "b7", question: "Do you track inventory anywhere outside QuickBooks?", why: "Roaster with no inventory in the books.", signalId: "S4" },
  { id: "b9", question: "What did Summit Bookkeeping cover for $3,200 a month, and why did you stop?", why: "Ledger shows $3,200 a month to Summit Bookkeeping until Feb 2026; sets the savings comparison." },
  { id: "b8", question: "What reporting do investors or lenders expect, and by which day each month?", why: "Class tracking is set up by channel.", signalId: "S2" },
];

export const meeting: Meeting = {
  platform: "zoom",
  title: "Brightside × Global Insights: discovery call",
  startedAt: "2026-10-07T17:00:00Z",
  durationMinutes: 38,
  attendees: ["Priya Sharma (Global Insights)", "Maya Chen (Brightside, CEO)", "Daniel Ortiz (Brightside, Operations)"],
  consentLogged: true,
  transcriptReceivedAt: "2026-10-07T17:41:00Z",
  extractionSeconds: 134,
};

export const transcript: TranscriptSegment[] = [
  { id: "s1", speaker: "Priya Sharma", side: "kpo", start: 0, text: "Thanks for joining. I’ve already had a look at your QuickBooks, so I’d like to use this time to confirm a few things and understand what you need from us." },
  { id: "s2", speaker: "Maya Chen", side: "prospect", start: 41, text: "Great. Honestly, the books have slipped since we let our bookkeeping firm go in March. Daniel has kept things moving, but reconciliations haven’t been done." },
  { id: "s3", speaker: "Priya Sharma", side: "kpo", start: 80, text: "That matches what we saw. All five bank and card accounts were last reconciled in February. Is anything sitting in the bank feed that hasn’t been categorised yet?" },
  { id: "s4", speaker: "Daniel Ortiz", side: "prospect", start: 112, text: "Yes, September is basically untouched in the bank feed. Everything before that is categorised, though some of it went into Ask My Accountant." },
  { id: "s5", speaker: "Priya Sharma", side: "kpo", start: 150, text: "How many transactions would you say you have in a month?" },
  { id: "s6", speaker: "Maya Chen", side: "prospect", start: 164, text: "I’d guess around four hundred? Most of it is Shopify." },
  { id: "s7", speaker: "Priya Sharma", side: "kpo", start: 185, text: "The ledger actually shows about six hundred and forty a month across bank and cards over the last six months, and it gets close to eight hundred in December." },
  { id: "s8", speaker: "Maya Chen", side: "prospect", start: 208, text: "Wow, okay. The holidays are crazy for us with gift subscriptions." },
  { id: "s9", speaker: "Priya Sharma", side: "kpo", start: 242, text: "On subscriptions, I see a deferred revenue account. Who manages that?" },
  { id: "s10", speaker: "Daniel Ortiz", side: "prospect", start: 260, text: "I do a journal entry at month-end from a Shopify export. It takes me half a day." },
  { id: "s11", speaker: "Priya Sharma", side: "kpo", start: 310, text: "On payments, there’s Shopify Payments and Stripe. Is Stripe only for wholesale?" },
  { id: "s12", speaker: "Daniel Ortiz", side: "prospect", start: 324, text: "Yes. Our café wholesale customers pay invoices through Stripe, about sixty invoices a month. No other processors." },
  { id: "s13", speaker: "Maya Chen", side: "prospect", start: 375, text: "The thing that hurts most is bills: green-coffee importers, packaging, freight. Daniel pays them all manually. We’d love you to take over AP." },
  { id: "s14", speaker: "Priya Sharma", side: "kpo", start: 422, text: "Understood. And on receivables, do you want us to handle invoicing and chasing overdue cafés?" },
  { id: "s15", speaker: "Maya Chen", side: "prospect", start: 440, text: "Invoicing, yes. Chasing, we’d rather keep that relationship ourselves for now." },
  { id: "s16", speaker: "Priya Sharma", side: "kpo", start: 485, text: "Does payroll run through Gusto?" },
  { id: "s17", speaker: "Daniel Ortiz", side: "prospect", start: 496, text: "Semi-monthly, eighteen people including the roasters. We’d consider handing over payroll admin too, but it isn’t urgent." },
  { id: "s18", speaker: "Maya Chen", side: "prospect", start: 580, text: "Our investors want a monthly reporting pack, ideally split by wholesale, retail and online. We already use classes for that." },
  { id: "s19", speaker: "Priya Sharma", side: "kpo", start: 630, text: "On sales tax, we see filings for Washington and California." },
  { id: "s20", speaker: "Daniel Ortiz", side: "prospect", start: 644, text: "Washington monthly, California quarterly. I file them myself and I’d happily give that up." },
  { id: "s21", speaker: "Priya Sharma", side: "kpo", start: 690, text: "I don’t see any inventory in QuickBooks. Do you track it anywhere?" },
  { id: "s22", speaker: "Daniel Ortiz", side: "prospect", start: 702, text: "We track green coffee in a spreadsheet. We’d like proper inventory accounting next year, not right now." },
  { id: "s23", speaker: "Maya Chen", side: "prospect", start: 760, text: "Timing-wise, we’d like the books cleaned up before our investor update in December, and ideally the close done by the tenth of each month." },
  { id: "s25", speaker: "Priya Sharma", side: "kpo", start: 802, text: "One last thing. The ledger shows payments to Summit Bookkeeping until February. What did they cover for that?" },
  { id: "s26", speaker: "Maya Chen", side: "prospect", start: 815, text: "Thirty-two hundred a month, and that was just bookkeeping and reconciliations. We still paid bills and filed sales tax ourselves, and they were always behind." },
  { id: "s24", speaker: "Priya Sharma", side: "kpo", start: 862, text: "That’s really helpful. We’ll send a proposal with a cleanup project and a few package options by tomorrow." },
];

export const requirements: Requirement[] = [
  { id: "r1", field: "Accounts payable", value: "Take over bill entry and payments (biggest pain point)", confidence: "high", segmentIds: ["s13"] },
  { id: "r2", field: "Accounts receivable", value: "Invoicing yes; collections stay with the client", confidence: "high", segmentIds: ["s12", "s15"] },
  { id: "r3", field: "Sales tax", value: "File WA (monthly) and CA (quarterly)", confidence: "high", segmentIds: ["s20"] },
  { id: "r4", field: "Reporting", value: "Monthly investor pack by class (wholesale / retail / online)", confidence: "high", segmentIds: ["s18"] },
  { id: "r5", field: "Close deadline", value: "Close complete by day 10", confidence: "high", segmentIds: ["s23"] },
  { id: "r6", field: "Cleanup deadline", value: "Books clean before the December investor update", confidence: "high", segmentIds: ["s23"] },
  { id: "r7", field: "Payroll", value: "Gusto, semi-monthly, 18 employees; takeover optional, not urgent", confidence: "medium", segmentIds: ["s16", "s17"] },
  { id: "r8", field: "Inventory", value: "Tracked in a spreadsheet; inventory accounting wanted next year", confidence: "medium", segmentIds: ["s22"] },
  { id: "r9", field: "Bank-feed backlog", value: "September not categorised (1 month catch-up)", confidence: "high", segmentIds: ["s4"] },
  { id: "r11", field: "Current spend", value: "$3,200 / month to Summit Bookkeeping (bookkeeping and reconciliations only)", confidence: "high", segmentIds: ["s26"] },
  { id: "r10", field: "Decision maker", value: "Maya Chen (CEO); Daniel Ortiz day-to-day contact", confidence: "medium", segmentIds: ["s2", "s13"] },
];

export const briefAnswers: BriefAnswer[] = [
  { questionId: "b1", answer: "September is uncategorised in the bank feed.", segmentIds: ["s4"] },
  { questionId: "b2", answer: "Bookkeeping firm let go in March; Daniel has categorised but not reconciled.", segmentIds: ["s2", "s4"] },
  { questionId: "b3", answer: "Manual month-end JE from a Shopify export (about half a day).", segmentIds: ["s10"] },
  { questionId: "b4", answer: "Stripe is wholesale only; no other processors.", segmentIds: ["s12"] },
  { questionId: "b5", answer: "Gusto, semi-monthly, 18 employees.", segmentIds: ["s17"] },
  { questionId: "b6", answer: "WA monthly, CA quarterly; filed by Daniel today.", segmentIds: ["s20"] },
  { questionId: "b7", answer: "Green coffee tracked in a spreadsheet.", segmentIds: ["s22"] },
  { questionId: "b9", answer: "$3,200 a month for bookkeeping and reconciliations only; always behind.", segmentIds: ["s26"] },
  { questionId: "b8", answer: "Monthly investor pack by class, close by day 10.", segmentIds: ["s18", "s23"] },
];

export const contradictions: Contradiction[] = [
  {
    id: "c1",
    topic: "Monthly transaction volume",
    clientSaid: "“Around four hundred” a month",
    dataShows: `${sizing.sized} / month (sized), peaking near 790 in December`,
    segmentIds: ["s6"],
    signalId: "V1",
    resolution: "data",
  },
];

export const openItems = [
  "A Shopify subscriptions export, so we can rebuild deferred revenue",
  "Read-only access to Gusto payroll registers",
  "Access to the WA and CA sales-tax portals",
  "Your green-coffee inventory spreadsheet (for next year’s scope)",
];

export const questionnaire = [
  { q: "What services are you looking for?", a: "Bookkeeping, bill pay, monthly reporting" },
  { q: "What’s prompting the change?", a: "We let our bookkeeping firm go in March and we’ve fallen behind." },
  { q: "Other tools you use", a: "Shopify, Stripe, Gusto, Bill.com (trial)" },
  { q: "Number of employees", a: "18" },
  { q: "Ideal start date", a: "As soon as possible, before December" },
  { q: "Monthly budget range", a: "$2,000 – $3,000" },
];

export const workloadDrivers: WorkloadDrivers = {
  bankCardTxns: sizing.sized,
  bankAccounts: 3,
  cardAccounts: 2,
  invoices: 62,
  customerPayments: 84,
  overdueCustomers: 9,
  bills: 92,
  billPayments: 71,
  paymentPlatforms: 2,
  payrollRuns: 2,
  payrollEmployeeRuns: 36,
  manualJEs: 18,
  closeSchedules: 3,
  deferredRevenue: 1,
  reportingDimensions: 1,
  salesTaxFilings: 4 / 3,
  inventoryTxns: 0,
  hasInventory: 0,
  extraEntities: 0,
  intercompany: 0,
  vendors1099: 24,
  accrualBasis: true,
  foreignTxnPct: 0,
  industry: "ecommerce",
};

/** The client's own estimate, used if the analyst resolves the contradiction in their favour. */
export const clientStatedTxns = 400;

export const cleanupDrivers: CleanupDrivers = {
  unreconciledAccountMonths: 5 * 7,
  txnsInUnreconciledPeriods: bankCard.slice(-7).reduce((a, b) => a + b, 0),
  uncategorizedTxns: 212,
  duplicates: 14,
  undepositedItems: 38,
  staleArApItems: 46,
  obeNonZero: true,
  coaStatus: "amber",
  backlogMonths: 1, // from the call: September not categorised (s4)
};

export const scope: ScopeLine[] = [
  { serviceId: "bookkeeping", source: "data", rationale: "~640 bank and card transactions a month", confidence: "high", included: true, signalIds: ["V1"] },
  { serviceId: "reconciliation", source: "data", rationale: "3 bank + 2 card accounts", confidence: "high", included: true, signalIds: ["V2", "V3"] },
  { serviceId: "clearing", source: "data", rationale: "Shopify Payments + Stripe clearing accounts", confidence: "high", included: true, signalIds: ["S6"], segmentIds: ["s12"] },
  { serviceId: "payroll_journal", source: "data", rationale: "Semi-monthly Gusto payroll to record", confidence: "high", included: true, signalIds: ["V8"] },
  { serviceId: "sales_tax", source: "call", rationale: "WA monthly + CA quarterly; client wants to hand over filing", confidence: "high", included: true, signalIds: ["S5"], segmentIds: ["s20"] },
  { serviceId: "accounts_payable", source: "call", rationale: "92 bills / month; client’s biggest pain point", confidence: "high", included: true, signalIds: ["V6", "V7"], segmentIds: ["s13"] },
  { serviceId: "accounts_receivable", source: "call", rationale: "62 wholesale invoices / month; client wants invoicing handled", confidence: "high", included: true, signalIds: ["V4", "V5"], segmentIds: ["s12", "s15"] },
  { serviceId: "month_end_close", source: "data", rationale: "Accrual basis, deferred revenue, 3 schedules, close by day 10", confidence: "high", included: true, signalIds: ["S7", "S8", "S9"], segmentIds: ["s23"] },
  { serviceId: "basic_financials", source: "analyst", rationale: "Standard monthly P&L and balance sheet", confidence: "high", included: true },
  { serviceId: "mgmt_reporting", source: "call", rationale: "Investors want a monthly reporting pack", confidence: "high", included: true, segmentIds: ["s18"] },
  { serviceId: "advanced_reporting", source: "call", rationale: "Split by wholesale / retail / online classes", confidence: "medium", included: true, signalIds: ["S2"], segmentIds: ["s18"] },
  { serviceId: "payroll", source: "call", rationale: "Open to handing over Gusto admin, not urgent", confidence: "medium", included: true, segmentIds: ["s17"] },
  { serviceId: "year_end_1099", source: "data", rationale: "24 vendors likely need 1099s", confidence: "medium", included: true, signalIds: ["V11"] },
  { serviceId: "collections", source: "call", rationale: "Client keeps collections in-house for now", confidence: "high", included: false, signalIds: ["Q7"], segmentIds: ["s15"] },
  { serviceId: "inventory", source: "call", rationale: "Wanted next year, not in initial scope", confidence: "medium", included: false, signalIds: ["S4"], segmentIds: ["s22"] },
];

export const activity: { at: string; label: string; actor: string; minutes?: number }[] = [
  { at: "2026-10-02T21:05:00Z", label: "Prospect created from website enquiry", actor: "Priya Sharma", minutes: 2 },
  { at: "2026-10-02T21:06:00Z", label: "Portal link sent to Maya Chen", actor: "QuoteIQ" },
  { at: "2026-10-03T16:40:00Z", label: "Questionnaire completed", actor: "Maya Chen" },
  { at: "2026-10-05T09:12:00Z", label: "QuickBooks Online connected (accountant user)", actor: "Priya Sharma" },
  { at: "2026-10-05T09:21:00Z", label: "Snapshot pulled · trial balance tied 24 / 24 months", actor: "QuoteIQ" },
  { at: "2026-10-05T09:24:00Z", label: "Analysis complete · pre-call brief drafted", actor: "QuoteIQ" },
  { at: "2026-10-05T18:02:00Z", label: "Brief reviewed, 1 question edited", actor: "Priya Sharma", minutes: 8 },
  { at: "2026-10-07T17:00:00Z", label: "Consultation on Zoom (38 min)", actor: "Priya Sharma" },
  { at: "2026-10-07T17:41:00Z", label: "Transcript received via Zoom webhook", actor: "QuoteIQ" },
  { at: "2026-10-07T17:43:00Z", label: "Requirements extracted · scope and pricing drafted", actor: "QuoteIQ" },
];

export const recommendedPackage = "growth" as const;
export const payrollProvider = "Gusto";

export const confidence = {
  level: "medium" as const,
  reasons: [
    "Payroll headcount comes from the call, not the ledger",
    "Bank-feed backlog confirmed verbally (not visible via API)",
  ],
};

export const cleanup = {
  summary:
    "Bring the books current before monthly service starts: reconcile 35 account-months, recategorise suspense items, clear undeposited funds and catch up September.",
  deadline: "before your December investor update",
};
