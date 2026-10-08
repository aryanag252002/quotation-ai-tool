"use client";

/**
 * Deal workspace state: analyst decisions (scope, contradictions, overrides, approval)
 * layered on top of the analysis data, with the quote recomputed by the pricing engine.
 */
import { createContext, useCallback, useContext, useMemo } from "react";
import { usePricingConfig } from "@/lib/config/pricing-config-context";
import { persistedStore, usePersisted } from "@/lib/state/persisted-store";
import type { DealWorkspaceData } from "@/lib/data";
import {
  complexityMultiplier,
  quoteCleanup,
  quotePackage,
  requiredServiceIds,
  routeApproval,
  type ApprovalDecision,
  type CleanupQuote,
  type MultiplierResult,
  type PackageQuote,
} from "@/lib/engine/pricing";
import type {
  ApprovalEvent,
  BriefQuestion,
  Confidence,
  Deal,
  DealStage,
  MeetingPlatform,
  OverrideReason,
  PackageId,
  WorkloadDrivers,
} from "@/lib/types";

export type QuoteStatus = "draft" | "submitted" | "approved" | "changes_requested" | "sent";

interface DecisionState {
  briefQuestions: BriefQuestion[];
  briefReviewed: boolean;
  findingStatus: Record<string, "proposed" | "accepted" | "rejected">;
  scheduledCall: { platform: MeetingPlatform; at: string } | null;
  scopeIncluded: Record<string, boolean>;
  contradictionResolution: Record<string, "data" | "client">;
  recommendedPackage: PackageId;
  overrideFee: number | null;
  overrideReason: OverrideReason | null;
  overrideNote: string;
  protection: "true_up" | "contingency";
  status: QuoteStatus;
  /** Fee and cleanup at submission; approval is void if either changes. */
  submittedQuote: { fee: number; cleanup: number } | null;
  events: ApprovalEvent[];
}

function initialDecisions(data: DealWorkspaceData): DecisionState {
  return {
    briefQuestions: data.briefQuestions,
    briefReviewed: true,
    findingStatus: Object.fromEntries(data.findings.map((f) => [f.id, f.status])),
    scheduledCall: { platform: data.meeting.platform, at: data.meeting.startedAt },
    scopeIncluded: Object.fromEntries(data.scope.map((s) => [s.serviceId, s.included])),
    contradictionResolution: Object.fromEntries(data.contradictions.map((c) => [c.id, c.resolution])),
    recommendedPackage: "growth",
    overrideFee: null,
    overrideReason: null,
    overrideNote: "",
    protection: "true_up",
    status: "draft",
    submittedQuote: null,
    events: [],
  };
}

interface WorkspaceValue extends DecisionState {
  deal: Deal;
  data: DealWorkspaceData;
  set: <K extends keyof DecisionState>(key: K, value: DecisionState[K]) => void;
  addEvent: (event: Omit<ApprovalEvent, "at">) => void;
  resetDecisions: () => void;
  // derived
  drivers: WorkloadDrivers;
  inScope: Set<string>;
  required: Set<string>;
  multiplier: MultiplierResult;
  quotes: Record<PackageId, PackageQuote>;
  cleanup: CleanupQuote;
  confidence: Confidence;
  confidenceReasons: string[];
  engineFee: number;
  finalFee: number;
  approval: ApprovalDecision;
  /** True when the quote changed after it was submitted or approved. */
  isStale: boolean;
  /** Pipeline stage implied by the quote's live status. */
  liveStage: DealStage;
  submit: (args: { by: string; note: string; approved: boolean; quote: { fee: number; cleanup: number } }) => void;
}

const Ctx = createContext<WorkspaceValue | null>(null);
const key = (dealId: string) => `quoteiq.deal.${dealId}.v1`;

export function DealWorkspaceProvider({
  deal,
  data,
  children,
}: {
  deal: Deal;
  data: DealWorkspaceData;
  children: React.ReactNode;
}) {
  const { config } = usePricingConfig();
  const store = useMemo(
    () => persistedStore<Partial<DecisionState>>(key(deal.id), {}, (v) => typeof v === "object" && v !== null),
    [deal.id],
  );
  const saved = usePersisted(store);
  const state = useMemo<DecisionState>(() => ({ ...initialDecisions(data), ...saved }), [data, saved]);

  const set = useCallback<WorkspaceValue["set"]>(
    (k, v) => store.set((prev) => ({ ...prev, [k]: v })),
    [store],
  );

  const addEvent = useCallback<WorkspaceValue["addEvent"]>(
    (event) =>
      store.set((prev) => ({
        ...prev,
        events: [...(prev.events ?? []), { ...event, at: new Date().toISOString() }],
      })),
    [store],
  );

  const resetDecisions = useCallback(() => store.clear(), [store]);

  const submit = useCallback<WorkspaceValue["submit"]>(
    ({ by, note, approved, quote }) => {
      const at = new Date().toISOString();
      store.set((prev) => ({
        ...prev,
        status: approved ? "approved" : "submitted",
        submittedQuote: quote,
        events: [...(prev.events ?? []), { at, by, action: approved ? "approved" : "submitted", note }],
      }));
    },
    [store],
  );

  const derived = useMemo(() => {
    const volumeContradiction = data.contradictions.find((c) => c.signalId === "V1");
    const useClientVolume =
      volumeContradiction && state.contradictionResolution[volumeContradiction.id] === "client";
    const drivers: WorkloadDrivers = {
      ...data.workloadDrivers,
      bankCardTxns: useClientVolume ? data.clientStatedTxns : data.workloadDrivers.bankCardTxns,
    };
    const required = new Set(requiredServiceIds(drivers));
    const inScope = new Set(
      Object.entries(state.scopeIncluded)
        .filter(([id, inc]) => inc || required.has(id))
        .map(([id]) => id),
    );
    const contingency = state.protection === "contingency";
    const quotes = {
      essential: quotePackage(config, "essential", drivers, inScope, { contingency }),
      growth: quotePackage(config, "growth", drivers, inScope, { contingency }),
      premium: quotePackage(config, "premium", drivers, inScope, { contingency }),
    };
    const cleanup = quoteCleanup(config, data.cleanupDrivers, drivers);
    const confidenceReasons = [
      "Payroll headcount comes from the call, not the ledger",
      "Bank-feed backlog confirmed verbally (not visible via API)",
    ];
    if (useClientVolume) confidenceReasons.unshift("Volume set to the client’s estimate, below what the ledger shows");
    const confidence: Confidence = useClientVolume ? "low" : "medium";
    const recommended = quotes[state.recommendedPackage];
    const engineFee = recommended.monthlyFee;
    const finalFee = state.overrideFee ?? engineFee;
    const approval = routeApproval(config, {
      engineMonthlyFee: engineFee,
      finalMonthlyFee: finalFee,
      monthlyCost: recommended.monthlyCost,
      cleanupFee: cleanup.fee,
      confidence,
    });
    const pending = state.status === "submitted" || state.status === "approved";
    const isStale =
      pending &&
      !!state.submittedQuote &&
      (state.submittedQuote.fee !== finalFee || state.submittedQuote.cleanup !== cleanup.fee);
    const liveStage: DealStage =
      state.status === "sent"
        ? "sent"
        : pending || state.status === "changes_requested"
          ? "pending_approval"
          : deal.stage;
    return {
      isStale,
      liveStage,
      drivers,
      inScope,
      required,
      multiplier: complexityMultiplier(config, drivers),
      quotes,
      cleanup,
      confidence,
      confidenceReasons,
      engineFee,
      finalFee,
      approval,
    };
  }, [config, data, state, deal.stage]);

  const value = useMemo<WorkspaceValue>(
    () => ({ ...state, ...derived, deal, data, set, addEvent, resetDecisions, submit }),
    [state, derived, deal, data, set, addEvent, resetDecisions, submit],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDealWorkspace() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDealWorkspace must be used inside DealWorkspaceProvider");
  return ctx;
}
