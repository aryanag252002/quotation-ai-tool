/**
 * Default pricing configuration: Decision B in docs/pricing-model.md, expressed as data.
 * Everything here is editable in Settings; the pricing engine reads only this object.
 */
import type { DriverKey, Industry, PackageId, Role } from "@/lib/types";

export interface TimeStandard {
  id: string;
  label: string;
  /** Minutes or hours per unit of the driver (or per month when driver is null). */
  unit: "min" | "h";
  value: number;
  /** null = fixed amount per month. */
  driver: DriverKey | null;
}

export interface ServiceDef {
  id: string;
  name: string;
  description: string;
  role: Role;
  /** Complexity multipliers apply to L1 transactional services. */
  applyMultiplier: boolean;
  /** Annual services are amortised monthly when bundled, otherwise quoted separately. */
  billing: "monthly" | "annual";
  /** Services this one supersedes when both are in a package. */
  replaces?: string[];
  standards: TimeStandard[];
}

export interface PackageDef {
  id: PackageId;
  name: string;
  tagline: string;
  services: string[];
  closeDay: number;
  reviewCall: string;
  /** Extra L3 hours per month (dedicated manager). */
  extraManagerHours: number;
  /** SLA premium as a fraction (0.1 = +10%). */
  slaPremium: number;
}

export interface ApprovalRules {
  analystMaxMonthlyFee: number;
  analystMaxCleanupFee: number;
  analystMaxOverridePct: number;
  partnerMinMonthlyFee: number;
  partnerMinCleanupFee: number;
  partnerMaxDiscountPct: number;
  partnerMinMarginPct: number;
}

export interface PricingConfig {
  version: string;
  currency: "USD" | "INR" | "GBP" | "AUD" | "AED";
  roles: Record<Role, { label: string; cost: number }>;
  targetMargin: number;
  reviewPct: number;
  clientManagementHours: number;
  multiplierCap: number;
  multipliers: {
    accrual: number;
    multiCurrency: number;
    multiCurrencyThresholdPct: number;
    perDimension: number;
    dimensionCap: number;
    industry: Record<Industry, number>;
  };
  minMonthlyFee: number;
  roundMonthlyTo: number;
  roundCleanupTo: number;
  cleanup: {
    perAccountMonthMin: number;
    perTxnInPeriodMin: number;
    perUncategorizedMin: number;
    perDuplicateMin: number;
    perUndepositedMin: number;
    perStaleItemMin: number;
    obeHours: number;
    coaAmberHours: number;
    coaRedHours: number;
    backlogFactor: number;
    mixL1: number; // share of cleanup hours at L1, remainder L2
    premium: number; // 0.1 = +10%
  };
  contingencyPct: number;
  services: ServiceDef[];
  packages: PackageDef[];
  approval: ApprovalRules;
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  version: "v1-default",
  currency: "USD",
  roles: {
    L1: { label: "Bookkeeper", cost: 10 },
    L2: { label: "Senior accountant", cost: 16 },
    L3: { label: "Manager", cost: 28 },
  },
  targetMargin: 0.6,
  reviewPct: 0.15,
  clientManagementHours: 2,
  multiplierCap: 1.5,
  multipliers: {
    accrual: 1.1,
    multiCurrency: 1.15,
    multiCurrencyThresholdPct: 10,
    perDimension: 1.1,
    dimensionCap: 1.2,
    industry: {
      ecommerce: 1.05,
      construction: 1.15,
      nonprofit: 1.1,
      professional_services: 1,
      healthcare: 1,
      real_estate: 1,
      logistics: 1,
      other: 1,
    },
  },
  minMonthlyFee: 500,
  roundMonthlyTo: 50,
  roundCleanupTo: 100,
  cleanup: {
    perAccountMonthMin: 45,
    perTxnInPeriodMin: 0.5,
    perUncategorizedMin: 3,
    perDuplicateMin: 5,
    perUndepositedMin: 3,
    perStaleItemMin: 5,
    obeHours: 2,
    coaAmberHours: 4,
    coaRedHours: 8,
    backlogFactor: 1.2,
    mixL1: 0.7,
    premium: 0.1,
  },
  contingencyPct: 0.1,
  services: [
    {
      id: "bookkeeping",
      name: "Bookkeeping",
      description: "Categorise bank and card transactions, apply bank rules, attach receipts.",
      role: "L1",
      applyMultiplier: true,
      billing: "monthly",
      standards: [{ id: "bk_txn", label: "per bank / card transaction", unit: "min", value: 1.5, driver: "bankCardTxns" }],
    },
    {
      id: "reconciliation",
      name: "Bank & card reconciliation",
      description: "Monthly reconciliation of every bank and credit-card account.",
      role: "L1",
      applyMultiplier: true,
      billing: "monthly",
      standards: [
        { id: "rec_bank", label: "per bank account", unit: "min", value: 30, driver: "bankAccounts" },
        { id: "rec_card", label: "per card account", unit: "min", value: 25, driver: "cardAccounts" },
      ],
    },
    {
      id: "basic_financials",
      name: "Monthly financial statements",
      description: "Monthly P&L and balance sheet.",
      role: "L2",
      applyMultiplier: false,
      billing: "monthly",
      standards: [{ id: "fin_base", label: "fixed per month", unit: "h", value: 0.5, driver: null }],
    },
    {
      id: "accounts_receivable",
      name: "Accounts receivable",
      description: "Create invoices, apply customer payments, maintain AR aging.",
      role: "L1",
      applyMultiplier: true,
      billing: "monthly",
      standards: [
        { id: "ar_inv", label: "per invoice", unit: "min", value: 4, driver: "invoices" },
        { id: "ar_pmt", label: "per customer payment", unit: "min", value: 1.5, driver: "customerPayments" },
      ],
    },
    {
      id: "collections",
      name: "Collections follow-up",
      description: "Polite reminders and follow-up on overdue customers.",
      role: "L1",
      applyMultiplier: false,
      billing: "monthly",
      standards: [{ id: "col_cust", label: "per overdue customer", unit: "min", value: 10, driver: "overdueCustomers" }],
    },
    {
      id: "accounts_payable",
      name: "Accounts payable",
      description: "Enter and code vendor bills, schedule bill payments.",
      role: "L1",
      applyMultiplier: true,
      billing: "monthly",
      standards: [
        { id: "ap_bill", label: "per vendor bill", unit: "min", value: 4, driver: "bills" },
        { id: "ap_pmt", label: "per bill payment", unit: "min", value: 2, driver: "billPayments" },
      ],
    },
    {
      id: "clearing",
      name: "Payment-processor clearing",
      description: "Reconcile Stripe / Shopify / PayPal payouts, fees and refunds.",
      role: "L1",
      applyMultiplier: true,
      billing: "monthly",
      standards: [{ id: "clr_plat", label: "per platform", unit: "h", value: 1.5, driver: "paymentPlatforms" }],
    },
    {
      id: "payroll_journal",
      name: "Payroll journal entries",
      description: "Record payroll from the client's provider (Gusto, ADP…).",
      role: "L1",
      applyMultiplier: false,
      billing: "monthly",
      standards: [{ id: "prj_run", label: "per payroll run", unit: "min", value: 20, driver: "payrollRuns" }],
    },
    {
      id: "payroll",
      name: "Payroll processing",
      description: "Run payroll end-to-end, including filings with the provider.",
      role: "L2",
      applyMultiplier: false,
      billing: "monthly",
      replaces: ["payroll_journal"],
      standards: [
        { id: "pr_run", label: "per payroll run", unit: "min", value: 30, driver: "payrollRuns" },
        { id: "pr_emp", label: "per employee per run", unit: "min", value: 3, driver: "payrollEmployeeRuns" },
      ],
    },
    {
      id: "month_end_close",
      name: "Month-end close",
      description: "Accruals, prepaids, depreciation, loan schedules and adjusting entries.",
      role: "L2",
      applyMultiplier: false,
      billing: "monthly",
      standards: [
        { id: "cl_base", label: "fixed per month", unit: "h", value: 4, driver: null },
        { id: "cl_je", label: "per manual journal entry", unit: "min", value: 10, driver: "manualJEs" },
        { id: "cl_sched", label: "per schedule (accruals, prepaids, FA, loans)", unit: "min", value: 30, driver: "closeSchedules" },
        { id: "cl_def", label: "deferred revenue", unit: "h", value: 2, driver: "deferredRevenue" },
      ],
    },
    {
      id: "mgmt_reporting",
      name: "Management reporting",
      description: "Monthly reporting package: P&L, balance sheet, cash flow, KPIs.",
      role: "L2",
      applyMultiplier: false,
      billing: "monthly",
      standards: [{ id: "mr_base", label: "fixed per month", unit: "h", value: 1.5, driver: null }],
    },
    {
      id: "advanced_reporting",
      name: "Dimension reporting & commentary",
      description: "Class / location reporting with written commentary.",
      role: "L2",
      applyMultiplier: false,
      billing: "monthly",
      standards: [
        { id: "ar_dim", label: "per tracking dimension", unit: "h", value: 1, driver: "reportingDimensions" },
        { id: "ar_comm", label: "commentary, fixed per month", unit: "h", value: 2, driver: null },
      ],
    },
    {
      id: "sales_tax",
      name: "Sales-tax filing",
      description: "Prepare and file sales-tax returns for every jurisdiction.",
      role: "L2",
      applyMultiplier: false,
      billing: "monthly",
      standards: [{ id: "st_filing", label: "per filing (monthly equivalent)", unit: "h", value: 1.5, driver: "salesTaxFilings" }],
    },
    {
      id: "inventory",
      name: "Inventory accounting",
      description: "Inventory valuation, COGS and count reconciliation.",
      role: "L2",
      applyMultiplier: false,
      billing: "monthly",
      standards: [
        { id: "inv_base", label: "fixed per month (if inventory)", unit: "h", value: 3, driver: "hasInventory" },
        { id: "inv_txn", label: "per inventory transaction", unit: "min", value: 0.5, driver: "inventoryTxns" },
      ],
    },
    {
      id: "consolidation",
      name: "Multi-entity consolidation",
      description: "Consolidate entities and eliminate intercompany balances.",
      role: "L2",
      applyMultiplier: false,
      billing: "monthly",
      standards: [
        { id: "con_ent", label: "per additional entity", unit: "h", value: 3, driver: "extraEntities" },
        { id: "con_ic", label: "intercompany", unit: "h", value: 1, driver: "intercompany" },
      ],
    },
    {
      id: "year_end_1099",
      name: "1099 & year-end package",
      description: "1099 preparation and the year-end package for the tax preparer.",
      role: "L2",
      applyMultiplier: false,
      billing: "annual",
      standards: [
        { id: "ye_1099", label: "per 1099 vendor (annual)", unit: "min", value: 15, driver: "vendors1099" },
        { id: "ye_base", label: "year-end package (annual)", unit: "h", value: 6, driver: null },
      ],
    },
  ],
  packages: [
    {
      id: "essential",
      name: "Essential",
      tagline: "Clean, reconciled books every month.",
      services: ["bookkeeping", "reconciliation", "basic_financials"],
      closeDay: 15,
      reviewCall: "Quarterly",
      extraManagerHours: 0,
      slaPremium: 0,
    },
    {
      id: "growth",
      name: "Growth",
      tagline: "Full accounting function with a proper month-end close.",
      services: [
        "bookkeeping",
        "reconciliation",
        "basic_financials",
        "accounts_receivable",
        "accounts_payable",
        "clearing",
        "month_end_close",
        "mgmt_reporting",
      ],
      closeDay: 10,
      reviewCall: "Monthly",
      extraManagerHours: 0,
      slaPremium: 0,
    },
    {
      id: "premium",
      name: "Premium",
      tagline: "Outsourced finance team with payroll and a dedicated manager.",
      services: [
        "bookkeeping",
        "reconciliation",
        "basic_financials",
        "accounts_receivable",
        "accounts_payable",
        "clearing",
        "month_end_close",
        "mgmt_reporting",
        "payroll",
        "advanced_reporting",
        "year_end_1099",
        "collections",
      ],
      closeDay: 5,
      reviewCall: "Monthly",
      extraManagerHours: 2,
      slaPremium: 0.1,
    },
  ],
  approval: {
    analystMaxMonthlyFee: 2500,
    analystMaxCleanupFee: 5000,
    analystMaxOverridePct: 5,
    partnerMinMonthlyFee: 6000,
    partnerMinCleanupFee: 10000,
    partnerMaxDiscountPct: 15,
    partnerMinMarginPct: 45,
  },
};
