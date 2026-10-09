/**
 * Compares the quote with what the prospect pays for bookkeeping today.
 * Positive amounts are savings; negative amounts mean our package costs more.
 */
import type { PackageQuote } from "@/lib/engine/pricing";
import type { PackageId } from "@/lib/types";

export interface Savings {
  /** What the prospect pays today, per month. */
  current: number;
  /** Our fee for the recommended package (after any override). */
  ours: number;
  monthly: number;
  /** Monthly saving as a share of today's cost. */
  pct: number;
  annual: number;
  /** Saving per package (recommended package uses the final fee). */
  perPackage: Record<PackageId, number>;
  /** Months of savings needed to cover the one-time cleanup; null when there is nothing to pay back. */
  paybackMonths: number | null;
  /** Annual saving minus the one-time cleanup. */
  firstYear: number;
  /** Services in the recommended package that the current provider doesn't cover. */
  added: { id: string; name: string }[];
}

export function compareSavings(input: {
  current: number;
  quotes: Record<PackageId, PackageQuote>;
  recommended: PackageId;
  finalFee: number;
  cleanupFee: number;
  coveredToday: readonly string[];
}): Savings {
  const { current, quotes, recommended, finalFee, cleanupFee, coveredToday } = input;
  const feeOf = (id: PackageId) => (id === recommended ? finalFee : quotes[id].monthlyFee);
  const perPackage = {
    essential: current - feeOf("essential"),
    growth: current - feeOf("growth"),
    premium: current - feeOf("premium"),
  };
  const monthly = perPackage[recommended];
  const covered = new Set(coveredToday);
  return {
    current,
    ours: finalFee,
    monthly,
    pct: current > 0 ? monthly / current : 0,
    annual: monthly * 12,
    perPackage,
    paybackMonths: monthly > 0 && cleanupFee > 0 ? Math.ceil(cleanupFee / monthly) : null,
    firstYear: monthly * 12 - cleanupFee,
    added: quotes[recommended].services
      .filter((s) => !covered.has(s.service.id))
      .map((s) => ({ id: s.service.id, name: s.service.name })),
  };
}
