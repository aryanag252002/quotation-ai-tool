"use client";

import { usePricingConfig } from "@/lib/config/pricing-config-context";
import type { DealWorkspaceData } from "@/lib/data";
import { quotePackage } from "@/lib/engine/pricing";
import { usd } from "@/lib/format";
import type { Deal } from "@/lib/types";

/** Shows the submitted fee, or the live engine draft for deals with workspace data. */
export function DealFee({ deal, workspace }: { deal: Deal; workspace?: DealWorkspaceData | null }) {
  const { config } = usePricingConfig();
  if (workspace && !deal.monthlyFee) {
    const inScope = new Set(workspace.scope.filter((s) => s.included).map((s) => s.serviceId));
    const fee = quotePackage(config, workspace.recommendedPackage, workspace.workloadDrivers, inScope).monthlyFee;
    return (
      <span className="num">
        {usd(fee)}
        <span className="ml-1 font-sans text-xs text-muted-foreground">draft</span>
      </span>
    );
  }
  return deal.monthlyFee ? <span className="num">{usd(deal.monthlyFee)}</span> : <span className="text-muted-foreground">—</span>;
}
