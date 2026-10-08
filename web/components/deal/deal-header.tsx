import { Building2, Clock, Mail, Timer, UserRound } from "lucide-react";
import { Pill } from "@/components/app/status";
import { duration, STAGE_BY_ID, SYSTEM_LABEL } from "@/lib/format";
import type { Deal, User } from "@/lib/types";

export function DealHeader({
  deal,
  owner,
  actions,
  stageSlot,
}: {
  deal: Deal;
  owner?: User;
  actions?: React.ReactNode;
  /** Replaces the stored-stage badge (e.g. with a live one). */
  stageSlot?: React.ReactNode;
}) {
  const stage = STAGE_BY_ID[deal.stage];
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{deal.prospect.name}</h1>
          {stageSlot ?? <Pill tone={stage.tone}>{stage.label}</Pill>}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="size-4" aria-hidden /> {deal.prospect.industryLabel} · {deal.prospect.location}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <UserRound className="size-4" aria-hidden /> {deal.prospect.contactName}, {deal.prospect.contactTitle}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Mail className="size-4" aria-hidden /> {deal.prospect.contactEmail}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="info">{SYSTEM_LABEL[deal.system]}</Pill>
        <Pill icon={Timer} tone={deal.touchMinutes <= 45 ? "success" : "warning"}>
          <span className="num">{deal.touchMinutes} min</span>&nbsp;human time
        </Pill>
        <Pill icon={Clock}>{duration(deal.elapsedHours)} elapsed</Pill>
        {owner ? <Pill>Owner: {owner.name}</Pill> : null}
        {actions}
      </div>
    </div>
  );
}
