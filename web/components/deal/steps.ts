import type { DealStage } from "@/lib/types";

export const DEAL_STEPS = [
  { slug: "", label: "Data access", short: "Data" },
  { slug: "analysis", label: "Analysis", short: "Analysis" },
  { slug: "requests", label: "Document request", short: "Docs" },
  { slug: "brief", label: "Pre-call brief", short: "Brief" },
  { slug: "meeting", label: "Consultation", short: "Call" },
  { slug: "scope", label: "Scope", short: "Scope" },
  { slug: "pricing", label: "Pricing", short: "Pricing" },
  { slug: "proposal", label: "Approval & proposal", short: "Proposal" },
] as const;

/** Index of the step the deal is currently on (0-based); steps before it are complete. */
export function currentStepIndex(stage: DealStage): number {
  switch (stage) {
    case "intake":
    case "awaiting_data":
      return 0;
    case "analyzing":
      return 1;
    case "brief_ready":
      return 3;
    case "call_scheduled":
      return 4;
    case "scope_review":
      return 5;
    case "pending_approval":
      return 7;
    default:
      return DEAL_STEPS.length;
  }
}

export const stepHref = (dealId: string, slug: string) => (slug ? `/deals/${dealId}/${slug}` : `/deals/${dealId}`);
