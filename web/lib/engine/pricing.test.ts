import { describe, expect, it } from "vitest";
import { DEFAULT_PRICING_CONFIG as config } from "@/lib/config/defaults";
import { cleanupDrivers, scope, workloadDrivers } from "@/lib/data/mock/brightside";
import {
  complexityMultiplier,
  packageServiceIds,
  priceRate,
  quoteCleanup,
  quotePackage,
  requiredServiceIds,
  routeApproval,
  roundUp,
} from "@/lib/engine/pricing";
import type { WorkloadDrivers } from "@/lib/types";

const inScope = new Set(scope.filter((s) => s.included).map((s) => s.serviceId));

const minimal: WorkloadDrivers = {
  ...workloadDrivers,
  bankCardTxns: 100,
  bankAccounts: 1,
  cardAccounts: 0,
  invoices: 0,
  customerPayments: 0,
  overdueCustomers: 0,
  bills: 0,
  billPayments: 0,
  paymentPlatforms: 0,
  payrollRuns: 0,
  payrollEmployeeRuns: 0,
  manualJEs: 0,
  closeSchedules: 0,
  deferredRevenue: 0,
  reportingDimensions: 0,
  salesTaxFilings: 0,
  vendors1099: 0,
  accrualBasis: false,
  industry: "other",
};

describe("rates", () => {
  it("derives price rates from cost and target margin", () => {
    expect(priceRate(config, "L1")).toBe(25);
    expect(priceRate(config, "L2")).toBe(40);
    expect(priceRate(config, "L3")).toBe(70);
  });
});

describe("complexity multiplier", () => {
  it("multiplies accrual, dimensions and industry factors", () => {
    const m = complexityMultiplier(config, workloadDrivers);
    expect(m.applied).toBeCloseTo(1.1 * 1.1 * 1.05, 4);
    expect(m.capped).toBe(false);
  });

  it("caps the combined multiplier", () => {
    const m = complexityMultiplier(config, {
      ...workloadDrivers,
      foreignTxnPct: 40,
      reportingDimensions: 3,
      industry: "construction",
    });
    expect(m.raw).toBeGreaterThan(1.5);
    expect(m.applied).toBe(1.5);
    expect(m.capped).toBe(true);
  });
});

describe("package services", () => {
  it("forces data-required services into every package", () => {
    expect(requiredServiceIds(workloadDrivers)).toEqual(
      expect.arrayContaining(["clearing", "sales_tax", "payroll_journal"]),
    );
    const essential = packageServiceIds(config, "essential", workloadDrivers, inScope);
    expect(essential).toEqual(expect.arrayContaining(["clearing", "sales_tax"]));
  });

  it("drops out-of-scope services and applies replacements", () => {
    const premium = packageServiceIds(config, "premium", workloadDrivers, inScope);
    expect(premium).not.toContain("collections");
    expect(premium).toContain("payroll");
    expect(premium).not.toContain("payroll_journal");
  });
});

describe("quotePackage", () => {
  it("is deterministic", () => {
    const a = quotePackage(config, "growth", workloadDrivers, inScope);
    const b = quotePackage(config, "growth", workloadDrivers, inScope);
    expect(a).toEqual(b);
  });

  it("prices a minimal client with review and management overhead", () => {
    const q = quotePackage(config, "essential", minimal, new Set(["bookkeeping", "reconciliation", "basic_financials"]));
    // 100 × 1.5 min = 2.5 h + 0.5 h recon (L1) + 0.5 h financials (L2)
    expect(q.byRole.L1.hours).toBeCloseTo(3, 6);
    expect(q.byRole.L2.hours).toBeCloseTo(0.5, 6);
    // review 15% of 3.5 h + 2 h client management
    expect(q.byRole.L3.hours).toBeCloseTo(0.525 + 2, 6);
    // 3×25 + 0.5×40 + 2.525×70 = 271.75 → minimum fee
    expect(q.monthlyFee).toBe(500);
  });

  it("orders Brightside packages Essential < Growth < Premium", () => {
    const fees = (["essential", "growth", "premium"] as const).map(
      (p) => quotePackage(config, p, workloadDrivers, inScope).monthlyFee,
    );
    expect(fees[0]).toBeLessThan(fees[1]);
    expect(fees[1]).toBeLessThan(fees[2]);
    fees.forEach((f) => expect(f % config.roundMonthlyTo).toBe(0));
  });

  it("keeps margin at or above target after rounding", () => {
    const q = quotePackage(config, "growth", workloadDrivers, inScope);
    expect(q.margin).toBeGreaterThanOrEqual(config.targetMargin - 1e-9);
  });

  it("adds contingency when requested", () => {
    const base = quotePackage(config, "growth", workloadDrivers, inScope);
    const withC = quotePackage(config, "growth", workloadDrivers, inScope, { contingency: true });
    expect(withC.monthlyFee).toBeGreaterThan(base.monthlyFee);
  });
});

describe("cleanup", () => {
  it("prices cleanup at the blended rate with premium, rounded to $100", () => {
    const c = quoteCleanup(config, cleanupDrivers, workloadDrivers);
    expect(c.blendedRate).toBeCloseTo(0.7 * 25 + 0.3 * 40, 6);
    expect(c.fee % 100).toBe(0);
    expect(c.fee).toBeCloseTo(c.hours * c.blendedRate * 1.1, -2);
  });
});

describe("approval routing", () => {
  const base = { engineMonthlyFee: 2000, finalMonthlyFee: 2000, monthlyCost: 780, cleanupFee: 3000, confidence: "high" as const };

  it("lets the analyst send small, clean quotes", () => {
    expect(routeApproval(config, base).level).toBe("analyst");
  });
  it("routes overrides beyond ±5% to a manager", () => {
    expect(routeApproval(config, { ...base, finalMonthlyFee: 1880 }).level).toBe("manager");
  });
  it("routes low confidence to a manager", () => {
    expect(routeApproval(config, { ...base, confidence: "medium" }).level).toBe("manager");
  });
  it("routes large discounts and big fees to a partner", () => {
    expect(routeApproval(config, { ...base, finalMonthlyFee: 1600 }).level).toBe("partner");
    expect(routeApproval(config, { ...base, engineMonthlyFee: 6500, finalMonthlyFee: 6500, monthlyCost: 2500 }).level).toBe("partner");
  });
});

describe("helpers", () => {
  it("rounds up to a step", () => {
    expect(roundUp(2401, 50)).toBe(2450);
    expect(roundUp(2450, 50)).toBe(2450);
  });
});
