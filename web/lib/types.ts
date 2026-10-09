/**
 * Domain types. These mirror the app data model in docs/architecture.md §10 so the
 * mock service layer can later be swapped for the FastAPI backend without UI changes.
 */

// ── Shared ──────────────────────────────────────────────────────────────────

export type Rag = "green" | "amber" | "red" | "unknown";
export type Confidence = "high" | "medium" | "low";
export type Role = "L1" | "L2" | "L3";
export type UserRole = "analyst" | "manager" | "partner";

export type LedgerSystem = "qbo" | "xero" | "zoho" | "sage" | "netsuite" | "upload";
export type MeetingPlatform = "zoom" | "teams" | "meet";

export type DealStage =
  | "intake"
  | "awaiting_data"
  | "analyzing"
  | "brief_ready"
  | "call_scheduled"
  | "scope_review"
  | "pending_approval"
  | "sent"
  | "won"
  | "lost";

export type Industry =
  | "ecommerce"
  | "construction"
  | "nonprofit"
  | "professional_services"
  | "healthcare"
  | "real_estate"
  | "logistics"
  | "other";

export interface User {
  id: string;
  name: string;
  role: UserRole;
  initials: string;
}

// ── Prospect & deal ─────────────────────────────────────────────────────────

export interface Prospect {
  name: string;
  industry: Industry;
  industryLabel: string;
  location: string;
  website: string;
  contactName: string;
  contactTitle: string;
  contactEmail: string;
}

export interface Deal {
  id: string;
  prospect: Prospect;
  system: LedgerSystem;
  stage: DealStage;
  ownerId: string;
  createdAt: string; // ISO
  callAt?: string; // ISO
  /** Recommended-package monthly fee, when priced. */
  monthlyFee?: number;
  cleanupFee?: number;
  /** Human touch-time so far, in minutes. */
  touchMinutes: number;
  /** Wall-clock hours since intake. */
  elapsedHours: number;
  /** True when the demo has full workspace data for this deal. */
  hasFullData: boolean;
}

// ── Data access & snapshot ──────────────────────────────────────────────────

export type AccessPath = "accountant_user" | "prospect_oauth" | "file_upload";

export interface DataConnection {
  system: LedgerSystem;
  accessPath: AccessPath;
  companyName: string;
  externalId: string; // e.g. QBO realmId
  connectedBy: string;
  connectedAt: string;
  windowMonths: number;
  readOnlyEnforced: boolean;
}

export interface SyncEntity {
  entity: string;
  records: number;
  apiCalls: number;
  status: "done" | "running" | "pending" | "failed";
}

export interface CapabilityGap {
  id: string;
  label: string;
  impact: string;
  resolution: "pre_call_question" | "file_request" | "assumption";
}

export interface Snapshot {
  connection: DataConnection;
  syncedAt: string;
  durationMinutes: number;
  entities: SyncEntity[];
  tieOut: { monthsChecked: number; monthsTied: number; maxVariance: number };
  gaps: CapabilityGap[];
}

/** Monthly transaction counts used for the volume chart and sizing. */
export interface MonthlyVolume {
  month: string; // "2025-10"
  bankCard: number;
  invoices: number;
  bills: number;
  journals: number;
}

// ── Analysis ────────────────────────────────────────────────────────────────

export type SignalGroup = "volume" | "quality" | "structure" | "backlog";

export interface SignalValue {
  /** Signal id from docs/analysis-framework.md, e.g. "Q1". */
  id: string;
  value: number | boolean | null;
  /** Human display, e.g. "7 months" or "$18,420 · 212 txns". */
  display: string;
  /** Where the number came from (shown in the evidence drawer). */
  evidence: string;
  available: boolean;
}

/** Which financial statement a finding belongs to. */
export type Statement = "pl" | "bs";

export interface Finding {
  id: string;
  statement: Statement;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  signalIds: string[];
  status: "proposed" | "accepted" | "rejected";
}

export interface BriefQuestion {
  id: string;
  question: string;
  why: string;
  signalId?: string;
}

/** Headline figure from a financial statement, as reported in the prospect's books. */
export interface StatementFigure {
  label: string;
  value: string;
  hint?: string;
  tone?: "danger" | "warning";
}

export interface Financials {
  /** Profit & loss, trailing 12 months. */
  pl: { period: string; figures: StatementFigure[] };
  /** Balance sheet at the latest month-end. */
  bs: { asOf: string; figures: StatementFigure[] };
  /** Shown when the books are not reconciled, so figures may move after cleanup. */
  caveat: string | null;
}

/** What the prospect pays for bookkeeping today, so the proposal can show savings. */
export interface CurrentProvider {
  name: string;
  monthlyFee: number;
  /** Service ids the current provider covers (for "what you get that you don't today"). */
  services: string[];
  /** Where the figure came from first. */
  source: "ledger" | "call" | "portal";
  evidence: string;
  /** Transcript segments where the client confirmed it. */
  segmentIds?: string[];
}

// ── Meeting & transcript ────────────────────────────────────────────────────

export interface TranscriptSegment {
  id: string;
  speaker: string;
  side: "kpo" | "prospect";
  start: number; // seconds
  text: string;
}

export interface Meeting {
  platform: MeetingPlatform;
  title: string;
  startedAt: string;
  durationMinutes: number;
  attendees: string[];
  consentLogged: boolean;
  transcriptReceivedAt: string;
  extractionSeconds: number;
}

export interface Requirement {
  id: string;
  field: string;
  value: string;
  confidence: Confidence;
  segmentIds: string[];
}

export interface BriefAnswer {
  questionId: string;
  answer: string;
  segmentIds: string[];
}

export interface Contradiction {
  id: string;
  topic: string;
  clientSaid: string;
  dataShows: string;
  segmentIds: string[];
  signalId: string;
  /** Which value the scope should use. */
  resolution: "data" | "client";
}

// ── Pricing inputs ──────────────────────────────────────────────────────────

/** Monthly workload drivers produced by the analysis (and adjusted by the call). */
export interface WorkloadDrivers {
  bankCardTxns: number;
  bankAccounts: number;
  cardAccounts: number;
  invoices: number;
  customerPayments: number;
  overdueCustomers: number;
  bills: number;
  billPayments: number;
  paymentPlatforms: number;
  payrollRuns: number;
  /** employees × payroll runs */
  payrollEmployeeRuns: number;
  manualJEs: number;
  closeSchedules: number;
  deferredRevenue: number; // 0 or 1
  reportingDimensions: number;
  /** Sales-tax filings per month, summed over jurisdictions (quarterly = 1/3). */
  salesTaxFilings: number;
  inventoryTxns: number;
  hasInventory: number; // 0 or 1
  extraEntities: number;
  intercompany: number; // 0 or 1
  vendors1099: number;
  // multiplier inputs
  accrualBasis: boolean;
  foreignTxnPct: number;
  industry: Industry;
}

export type DriverKey = {
  [K in keyof WorkloadDrivers]: WorkloadDrivers[K] extends number ? K : never;
}[keyof WorkloadDrivers];

export interface CleanupDrivers {
  unreconciledAccountMonths: number;
  txnsInUnreconciledPeriods: number;
  uncategorizedTxns: number;
  duplicates: number;
  undepositedItems: number;
  staleArApItems: number;
  obeNonZero: boolean;
  coaStatus: Rag;
  backlogMonths: number;
}

// ── Scope & quote ───────────────────────────────────────────────────────────

export type ScopeSource = "data" | "call" | "analyst";

export interface ScopeLine {
  serviceId: string;
  source: ScopeSource;
  rationale: string;
  confidence: Confidence;
  included: boolean;
  segmentIds?: string[];
  signalIds?: string[];
}

export type PackageId = "essential" | "growth" | "premium";

export type OverrideReason = "competitive" | "strategic" | "referral" | "scope_uncertainty" | "other";

export interface ApprovalEvent {
  at: string;
  by: string;
  action: "submitted" | "approved" | "changes_requested" | "sent";
  note?: string;
}

// ── Workspace bundle ────────────────────────────────────────────────────────

export interface ActivityItem {
  at: string;
  label: string;
  actor: string;
  minutes?: number;
}

/** Everything the deal workspace needs (analysis, call, scope inputs). */
export interface DealWorkspaceData {
  volumes: MonthlyVolume[];
  snapshot: Snapshot;
  signals: SignalValue[];
  findings: Finding[];
  financials: Financials;
  currentProvider: CurrentProvider | null;
  briefSummary: string;
  briefQuestions: BriefQuestion[];
  meeting: Meeting;
  transcript: TranscriptSegment[];
  requirements: Requirement[];
  briefAnswers: BriefAnswer[];
  contradictions: Contradiction[];
  openItems: string[];
  questionnaire: { q: string; a: string }[];
  workloadDrivers: WorkloadDrivers;
  /** The client's own volume estimate, used if the analyst resolves the contradiction in their favour. */
  clientStatedTxns: number;
  cleanupDrivers: CleanupDrivers;
  scope: ScopeLine[];
  activity: ActivityItem[];
  recommendedPackage: PackageId;
  payrollProvider: string | null;
  confidence: { level: Confidence; reasons: string[] };
  /** Proposal copy for the cleanup project, e.g. "Bring the books current…". */
  cleanup: { summary: string; deadline: string };
}

// ── Prospects added during a demo (stored in the browser) ───────────────────

export type DemoSize = "small" | "medium" | "large";
export type DemoCondition = "clean" | "behind" | "messy";

export interface CustomDealProgress {
  connectedAt?: string;
  connectedBy?: string;
  analysedAt?: string;
  callStartedAt?: string;
  callPlatform?: MeetingPlatform;
  transcriptAt?: string;
}

export interface CustomDeal {
  id: string;
  createdAt: string;
  ownerId: string;
  prospect: Prospect;
  system: LedgerSystem;
  accessPath: AccessPath;
  notes: string;
  /** Shape of the simulated ledger, chosen on the intake form. */
  profile: { size: DemoSize; condition: DemoCondition; clientEstimate: number | null };
  progress: CustomDealProgress;
  portalAnswers?: { q: string; a: string }[];
}
