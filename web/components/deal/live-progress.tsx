"use client";

import { Pill } from "@/components/app/status";
import { DealHeader } from "@/components/deal/deal-header";
import { DealStepper } from "@/components/deal/deal-stepper";
import { STAGE_BY_ID } from "@/lib/format";
import { useDealWorkspace } from "@/lib/state/deal-workspace";
import type { User } from "@/lib/types";

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

/** Deal header showing live stage and human time. */
export function LiveDealHeader({ owner, actions }: { owner?: User; actions?: React.ReactNode }) {
  const { deal } = useDealWorkspace();
  return <DealHeader deal={deal} owner={owner} actions={actions} stageSlot={<LiveStagePill />} />;
}
