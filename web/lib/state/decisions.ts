"use client";

/** Analyst decisions per deal (persisted in the browser) and the stage they imply. */
import { persistedStore } from "@/lib/state/persisted-store";
import type { ApprovalEvent, BriefQuestion, DocumentRequest, DealStage, MeetingPlatform, OverrideReason, PackageId } from "@/lib/types";

export type QuoteStatus = "draft" | "submitted" | "approved" | "changes_requested" | "sent";

export interface DecisionState {
  briefQuestions: BriefQuestion[];
  briefReviewed: boolean;
  /** Documents requested from the client for reconciliation (editable, with received status). */
  docRequests: DocumentRequest[];
  docRequestsSentAt: string | null;
  findingStatus: Record<string, "proposed" | "accepted" | "rejected">;
  scheduledCall: { platform: MeetingPlatform; at: string } | null;
  scopeIncluded: Record<string, boolean>;
  contradictionResolution: Record<string, "data" | "client">;
  recommendedPackage: PackageId;
  overrideFee: number | null;
  overrideReason: OverrideReason | null;
  overrideNote: string;
  protection: "true_up" | "contingency";
  /** Analyst correction of what the prospect pays today (null = use the figure found). */
  currentFeeOverride: number | null;
  /** Include the savings comparison in the proposal. */
  showSavings: boolean;
  status: QuoteStatus;
  /** Fee and cleanup at submission; approval is void if either changes. */
  submittedQuote: { fee: number; cleanup: number } | null;
  events: ApprovalEvent[];
}

export const decisionStore = (dealId: string) =>
  persistedStore<Partial<DecisionState>>(`quoteiq.deal.${dealId}.v1`, {}, (v) => typeof v === "object" && v !== null);

/** Workflow milestones that happen outside the analyst's decisions (data connected, call held). */
export interface Milestones {
  /** False for prospects added during a demo, whose milestones are simulated. */
  simulated: boolean;
  connected: boolean;
  analysed: boolean;
  callHeld: boolean;
}

export const ALL_DONE: Milestones = { simulated: false, connected: true, analysed: true, callHeld: true };

/** Pipeline stage implied by the milestones and the quote's status. */
export function deriveStage(
  base: DealStage,
  m: Milestones,
  d: Pick<Partial<DecisionState>, "status" | "scheduledCall">,
): DealStage {
  if (d.status === "sent") return "sent";
  if (d.status === "submitted" || d.status === "approved" || d.status === "changes_requested") return "pending_approval";
  if (!m.simulated) return base;
  if (!m.connected) return "awaiting_data";
  if (!m.analysed) return "analyzing";
  if (!m.callHeld) return d.scheduledCall ? "call_scheduled" : "brief_ready";
  return "scope_review";
}
