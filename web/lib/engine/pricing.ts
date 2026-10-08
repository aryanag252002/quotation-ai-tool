/**
 * Deterministic pricing engine: Decision B in docs/pricing-model.md.
 *
 * Pure functions only: the same drivers + config always produce the same quote.
 * The LLM never calls into this with free-form numbers; it only explains the output.
 */
import type { PricingConfig, ServiceDef, TimeStandard } from "@/lib/config/defaults";
import type {
  CleanupDrivers,
  Confidence,
  PackageId,
  Role,
  UserRole,
  WorkloadDrivers,
} from "@/lib/types";

// ── Rates ───────────────────────────────────────────────────────────────────

export function priceRate(config: PricingConfig, role: Role): number {
  return round2(config.roles[role].cost / (1 - config.targetMargin));
}

// ── Multipliers ─────────────────────────────────────────────────────────────

export interface MultiplierPart {
  label: string;
  factor: number;
}

export interface MultiplierResult {
  parts: MultiplierPart[];
  raw: number;
  applied: number;
  capped: boolean;
}

export function complexityMultiplier(config: PricingConfig, d: WorkloadDrivers): MultiplierResult {
  const m = config.multipliers;
  const parts: MultiplierPart[] = [];
  if (d.accrualBasis) parts.push({ label: "Accrual basis", factor: m.accrual });
  if (d.foreignTxnPct >= m.multiCurrencyThresholdPct) {
    parts.push({ label: `Multi-currency (${d.foreignTxnPct}% foreign)`, factor: m.multiCurrency });
  }
  if (d.reportingDimensions > 0) {
    const dims = Math.min(Math.pow(m.perDimension, d.reportingDimensions), m.dimensionCap);
    parts.push({ label: `Tracking dimensions (${d.reportingDimensions})`, factor: round4(dims) });
  }
  const industry = m.industry[d.industry] ?? 1;
  if (industry !== 1) parts.push({ label: `Industry (${d.industry.replace("_", " ")})`, factor: industry });

  const raw = parts.reduce((acc, p) => acc * p.factor, 1);
  const applied = Math.min(raw, config.multiplierCap);
  return { parts, raw: round4(raw), applied: round4(applied), capped: raw > config.multiplierCap };
}

// ── Service hours ───────────────────────────────────────────────────────────

export interface StandardLine {
  standard: TimeStandard;
  driverValue: number; // 1 for fixed standards
  hours: number;
}

export interface ServiceHours {
  service: ServiceDef;
  lines: StandardLine[];
  baseHours: number;
  multiplier: number;
  /** Hours per month after multiplier (annual services amortised over 12). */
  hours: number;
}

export function standardHours(std: TimeStandard, drivers: WorkloadDrivers): StandardLine {
  const driverValue = std.driver === null ? 1 : (drivers[std.driver] as number);
  const perUnitHours = std.unit === "min" ? std.value / 60 : std.value;
  return { standard: std, driverValue, hours: perUnitHours * driverValue };
}

export function serviceHours(
  service: ServiceDef,
  drivers: WorkloadDrivers,
  multiplier: number,
): ServiceHours {
  const lines = service.standards.map((s) => standardHours(s, drivers));
  let baseHours = lines.reduce((acc, l) => acc + l.hours, 0);
  if (service.billing === "annual") baseHours = baseHours / 12;
  const m = service.applyMultiplier ? multiplier : 1;
  return { service, lines, baseHours, multiplier: m, hours: baseHours * m };
}

// ── Required services ───────────────────────────────────────────────────────

/** Services the data shows the client needs; included in every package. */
export function requiredServiceIds(d: WorkloadDrivers): string[] {
  const ids = ["bookkeeping", "reconciliation"];
  if (d.paymentPlatforms > 0) ids.push("clearing");
  if (d.salesTaxFilings > 0) ids.push("sales_tax");
  if (d.payrollRuns > 0) ids.push("payroll_journal");
  if (d.hasInventory > 0) ids.push("inventory");
  if (d.extraEntities > 0) ids.push("consolidation");
  return ids;
}

/** Resolve the final service list for a package given what is in scope. */
export function packageServiceIds(
  config: PricingConfig,
  packageId: PackageId,
  drivers: WorkloadDrivers,
  inScope: ReadonlySet<string>,
): string[] {
  const pkg = config.packages.find((p) => p.id === packageId);
  if (!pkg) throw new Error(`Unknown package ${packageId}`);
  const wanted = new Set([...pkg.services, ...requiredServiceIds(drivers)]);
  const chosen = config.services.filter((s) => wanted.has(s.id) && inScope.has(s.id));
  const replaced = new Set(chosen.flatMap((s) => s.replaces ?? []));
  return chosen.filter((s) => !replaced.has(s.id)).map((s) => s.id);
}

// ── Package quote ───────────────────────────────────────────────────────────

export interface RoleTotals {
  hours: number;
  cost: number;
  price: number;
}

export interface PackageQuote {
  packageId: PackageId;
  services: ServiceHours[];
  preparerHours: number;
  reviewHours: number;
  managementHours: number;
  totalHours: number;
  byRole: Record<Role, RoleTotals>;
  subtotal: number;
  slaPremium: number;
  contingency: number;
  monthlyFee: number;
  monthlyCost: number;
  margin: number;
}

export interface QuoteOptions {
  /** Apply the confidence contingency (instead of a 90-day true-up clause). */
  contingency: boolean;
}

export function quotePackage(
  config: PricingConfig,
  packageId: PackageId,
  drivers: WorkloadDrivers,
  inScope: ReadonlySet<string>,
  options: QuoteOptions = { contingency: false },
): PackageQuote {
  const pkg = config.packages.find((p) => p.id === packageId)!;
  const mult = complexityMultiplier(config, drivers).applied;
  const ids = new Set(packageServiceIds(config, packageId, drivers, inScope));
  const services = config.services
    .filter((s) => ids.has(s.id))
    .map((s) => serviceHours(s, drivers, mult))
    .filter((s) => s.hours > 0);

  const roleHours: Record<Role, number> = { L1: 0, L2: 0, L3: 0 };
  for (const s of services) roleHours[s.service.role] += s.hours;

  const preparerHours = roleHours.L1 + roleHours.L2 + roleHours.L3;
  const reviewHours = preparerHours * config.reviewPct;
  const managementHours = config.clientManagementHours + pkg.extraManagerHours;
  roleHours.L3 += reviewHours + managementHours;

  const byRole = {} as Record<Role, RoleTotals>;
  let subtotal = 0;
  let monthlyCost = 0;
  for (const role of ["L1", "L2", "L3"] as Role[]) {
    const hours = roleHours[role];
    const cost = hours * config.roles[role].cost;
    const price = hours * priceRate(config, role);
    byRole[role] = { hours, cost, price };
    subtotal += price;
    monthlyCost += cost;
  }

  const slaPremium = subtotal * pkg.slaPremium;
  const contingency = options.contingency ? (subtotal + slaPremium) * config.contingencyPct : 0;
  const monthlyFee = Math.max(
    config.minMonthlyFee,
    roundUp(subtotal + slaPremium + contingency, config.roundMonthlyTo),
  );

  return {
    packageId,
    services,
    preparerHours,
    reviewHours,
    managementHours,
    totalHours: preparerHours + reviewHours + managementHours,
    byRole,
    subtotal,
    slaPremium,
    contingency,
    monthlyFee,
    monthlyCost,
    margin: marginOf(monthlyFee, monthlyCost),
  };
}

export function marginOf(price: number, cost: number): number {
  return price <= 0 ? 0 : 1 - cost / price;
}

// ── Cleanup ─────────────────────────────────────────────────────────────────

export interface CleanupLine {
  label: string;
  quantity: string;
  hours: number;
}

export interface CleanupQuote {
  lines: CleanupLine[];
  hours: number;
  blendedRate: number;
  cost: number;
  fee: number;
}

export function quoteCleanup(
  config: PricingConfig,
  c: CleanupDrivers,
  drivers: WorkloadDrivers,
): CleanupQuote {
  const k = config.cleanup;
  const mult = complexityMultiplier(config, drivers).applied;
  const monthlyBookkeepingHours =
    serviceHours(config.services.find((s) => s.id === "bookkeeping")!, drivers, mult).hours;

  const lines: CleanupLine[] = [
    {
      label: "Reconcile unreconciled account-months",
      quantity: `${c.unreconciledAccountMonths} × ${k.perAccountMonthMin} min`,
      hours: (c.unreconciledAccountMonths * k.perAccountMonthMin) / 60,
    },
    {
      label: "Tick transactions in unreconciled periods",
      quantity: `${fmtInt(c.txnsInUnreconciledPeriods)} × ${k.perTxnInPeriodMin} min`,
      hours: (c.txnsInUnreconciledPeriods * k.perTxnInPeriodMin) / 60,
    },
    {
      label: "Recategorise uncategorized / suspense",
      quantity: `${c.uncategorizedTxns} × ${k.perUncategorizedMin} min`,
      hours: (c.uncategorizedTxns * k.perUncategorizedMin) / 60,
    },
    {
      label: "Resolve possible duplicates",
      quantity: `${c.duplicates} × ${k.perDuplicateMin} min`,
      hours: (c.duplicates * k.perDuplicateMin) / 60,
    },
    {
      label: "Clear aged undeposited funds",
      quantity: `${c.undepositedItems} × ${k.perUndepositedMin} min`,
      hours: (c.undepositedItems * k.perUndepositedMin) / 60,
    },
    {
      label: "Clean up stale AR / AP items",
      quantity: `${c.staleArApItems} × ${k.perStaleItemMin} min`,
      hours: (c.staleArApItems * k.perStaleItemMin) / 60,
    },
    {
      label: "Fix Opening Balance Equity",
      quantity: c.obeNonZero ? "fixed" : "not needed",
      hours: c.obeNonZero ? k.obeHours : 0,
    },
    {
      label: "Restructure chart of accounts",
      quantity: c.coaStatus === "red" ? "major" : c.coaStatus === "amber" ? "minor" : "not needed",
      hours: c.coaStatus === "red" ? k.coaRedHours : c.coaStatus === "amber" ? k.coaAmberHours : 0,
    },
    {
      label: "Catch-up bookkeeping for backlog months",
      quantity: `${c.backlogMonths} mo × ${round1(monthlyBookkeepingHours)} h × ${k.backlogFactor}`,
      hours: c.backlogMonths * monthlyBookkeepingHours * k.backlogFactor,
    },
  ].filter((l) => l.hours > 0);

  const hours = lines.reduce((acc, l) => acc + l.hours, 0);
  const blendedRate =
    k.mixL1 * priceRate(config, "L1") + (1 - k.mixL1) * priceRate(config, "L2");
  const blendedCost = k.mixL1 * config.roles.L1.cost + (1 - k.mixL1) * config.roles.L2.cost;
  const fee = hours > 0 ? roundNearest(hours * blendedRate * (1 + k.premium), config.roundCleanupTo) : 0;
  return { lines, hours, blendedRate, cost: hours * blendedCost, fee };
}

// ── Approval routing ────────────────────────────────────────────────────────

export interface ApprovalInput {
  engineMonthlyFee: number;
  finalMonthlyFee: number;
  monthlyCost: number;
  cleanupFee: number;
  confidence: Confidence;
}

export interface ApprovalDecision {
  level: UserRole;
  reasons: string[];
  overridePct: number;
  margin: number;
}

export function routeApproval(config: PricingConfig, input: ApprovalInput): ApprovalDecision {
  const r = config.approval;
  const overridePct =
    input.engineMonthlyFee > 0
      ? ((input.finalMonthlyFee - input.engineMonthlyFee) / input.engineMonthlyFee) * 100
      : 0;
  const margin = marginOf(input.finalMonthlyFee, input.monthlyCost);
  const fee = input.finalMonthlyFee;

  const partner: string[] = [];
  if (fee >= r.partnerMinMonthlyFee) partner.push(`Monthly fee ≥ ${usd(r.partnerMinMonthlyFee)}`);
  if (input.cleanupFee >= r.partnerMinCleanupFee) partner.push(`Cleanup fee ≥ ${usd(r.partnerMinCleanupFee)}`);
  if (-overridePct > r.partnerMaxDiscountPct) partner.push(`Discount > ${r.partnerMaxDiscountPct}%`);
  if (margin * 100 < r.partnerMinMarginPct) partner.push(`Margin < ${r.partnerMinMarginPct}%`);
  if (partner.length) return { level: "partner", reasons: partner, overridePct, margin };

  const manager: string[] = [];
  if (fee >= r.analystMaxMonthlyFee) manager.push(`Monthly fee ≥ ${usd(r.analystMaxMonthlyFee)}`);
  if (input.cleanupFee >= r.analystMaxCleanupFee) manager.push(`Cleanup fee ≥ ${usd(r.analystMaxCleanupFee)}`);
  if (Math.abs(overridePct) > r.analystMaxOverridePct) {
    manager.push(`Price override ${overridePct > 0 ? "+" : ""}${round1(overridePct)}% (limit ±${r.analystMaxOverridePct}%)`);
  }
  if (input.confidence !== "high") manager.push(`Data confidence is ${input.confidence}`);
  if (manager.length) return { level: "manager", reasons: manager, overridePct, margin };

  return { level: "analyst", reasons: ["Within analyst limits"], overridePct, margin };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export function roundUp(value: number, step: number): number {
  return Math.ceil(value / step - 1e-9) * step;
}

export function roundNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}
function fmtInt(n: number) {
  return n.toLocaleString("en-US");
}
function usd(n: number) {
  return `$${n.toLocaleString("en-US")}`;
}
