"use client";

import { Pill } from "@/components/app/status";
import { DealStepper } from "@/components/deal/deal-stepper";
import { STAGE_BY_ID } from "@/lib/format";
import { useDealWorkspace } from "@/lib/state/deal-workspace";

/** Stepper and stage badge driven by the quote's live status rather than the stored stage. */
export function LiveDealStepper() {
  const { deal, liveStage } = useDealWorkspace();
  return <DealStepper dealId={deal.id} stage={liveStage} />;
}

export function LiveStagePill() {
  const { liveStage } = useDealWorkspace();
  const stage = STAGE_BY_ID[liveStage];
  return <Pill tone={stage.tone}>{stage.label}</Pill>;
}
