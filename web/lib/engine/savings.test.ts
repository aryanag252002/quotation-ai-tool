import { describe, expect, it } from "vitest";
import { DEFAULT_PRICING_CONFIG as config } from "@/lib/config/defaults";
import { cleanupDrivers, currentProvider, scope, workloadDrivers } from "@/lib/data/mock/brightside";
import { quoteCleanup, quotePackage } from "@/lib/engine/pricing";
import { compareSavings } from "@/lib/engine/savings";

const inScope = new Set(scope.filter((s) => s.included).map((s) => s.serviceId));
const quotes = {
  essential: quotePackage(config, "essential", workloadDrivers, inScope),
  growth: quotePackage(config, "growth", workloadDrivers, inScope),
  premium: quotePackage(config, "premium", workloadDrivers, inScope),
};
const cleanupFee = quoteCleanup(config, cleanupDrivers, workloadDrivers).fee;
const base = { quotes, recommended: "growth" as const, cleanupFee, coveredToday: currentProvider.services };

describe("compareSavings (Brightside)", () => {
  const s = compareSavings({ ...base, current: currentProvider.monthlyFee, finalFee: quotes.growth.monthlyFee });

  it("saves money against the previous firm on the recommended package", () => {
    expect(s.monthly).toBe(currentProvider.monthlyFee - quotes.growth.monthlyFee);
    expect(s.monthly).toBeGreaterThan(0);
    expect(s.annual).toBe(s.monthly * 12);
    expect(s.firstYear).toBe(s.annual - cleanupFee);
  });

  it("pays back the cleanup from savings", () => {
    expect(s.paybackMonths).toBe(Math.ceil(cleanupFee / s.monthly));
  });

  it("lists services the previous firm did not cover", () => {
    const ids = s.added.map((a) => a.id);
    expect(ids).toContain("accounts_payable");
    expect(ids).toContain("sales_tax");
    expect(ids).not.toContain("bookkeeping");
  });

  it("orders package savings by price", () => {
    expect(s.perPackage.essential).toBeGreaterThanOrEqual(s.perPackage.growth);
    expect(s.perPackage.growth).toBeGreaterThanOrEqual(s.perPackage.premium);
  });
});

describe("compareSavings edge cases", () => {
  it("uses the overridden fee for the recommended package", () => {
    const s = compareSavings({ ...base, current: 3000, finalFee: 2000 });
    expect(s.monthly).toBe(1000);
    expect(s.perPackage.growth).toBe(1000);
  });

  it("reports a negative saving and no payback when we cost more", () => {
    const s = compareSavings({ ...base, current: 1000, finalFee: 2500 });
    expect(s.monthly).toBe(-1500);
    expect(s.pct).toBeLessThan(0);
    expect(s.paybackMonths).toBeNull();
  });

  it("has no payback period when there is no cleanup", () => {
    const s = compareSavings({ ...base, cleanupFee: 0, current: 3000, finalFee: 2000 });
    expect(s.paybackMonths).toBeNull();
    expect(s.firstYear).toBe(12_000);
  });
});
