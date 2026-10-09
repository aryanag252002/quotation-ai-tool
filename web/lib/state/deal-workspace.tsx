"use client";

/**
 * Deal workspace state: analyst decisions (scope, contradictions, overrides, approval)
 * layered on top of the analysis data, with the quote recomputed by the pricing engine.
 */
import { createContext, useCallback, useContext, useMemo } from "react";
import { usePricingConfig } from "@/lib/config/pricing-config-context";
import { ALL_DONE, decisionStore, deriveStage, type DecisionState, type Milestones } from "@/lib/state/decisions";
import { touchMinutes } from "@/lib/state/custom-deals";
import { usePersisted } from "@/lib/state/persisted-store";
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
import { buildDocumentRequests } from "@/lib/engine/requests";
import { compareSavings, type Savings } from "@/lib/engine/savings";
import type { ApprovalEvent, Confidence, CustomDeal, Deal, DealStage, PackageId, WorkloadDrivers } from "@/lib/types";

export type { QuoteStatus } from "@/lib/state/decisions";

function initialDecisions(data: DealWorkspaceData, fresh: boolean): DecisionState {
  return {
    briefQuestions: data.briefQuestions,
    briefReviewed: !fresh,
    docRequests: buildDocumentRequests(data),
    docRequestsSentAt: null,
    findingStatus: Object.fromEntries(data.findings.map((f) => [f.id, f.status])),
    scheduledCall: fresh ? null : { platform: data.meeting.platform, at: data.meeting.startedAt },
    liveCallStartedAt: null,
    scopeIncluded: Object.fromEntries(data.scope.map((s) => [s.serviceId, s.included])),
    contradictionResolution: Object.fromEntries(data.contradictions.map((c) => [c.id, c.resolution])),
    recommendedPackage: data.recommendedPackage,
    overrideFee: null,
    overrideReason: null,
    overrideNote: "",
    protection: "true_up",
    currentFeeOverride: null,
    showSavings: true,
    status: "draft",
    submittedQuote: null,
    events: [],
  };
}

interface WorkspaceValue extends DecisionState {
  /** The deal with its live stage (and live human time for demo prospects). */
  deal: Deal;
  milestones: Milestones;
  /** Set for prospects added during a demo. */
  custom?: CustomDeal;
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
  /** Comparison with what the prospect pays today; null when unknown. */
  savings: Savings | null;
  /** True when the quote changed after it was submitted or approved. */
  isStale: boolean;
  /** Pipeline stage implied by the quote's live status. */
  liveStage: DealStage;
  submit: (args: { by: string; note: string; approved: boolean; quote: { fee: number; cleanup: number } }) => void;
}

const Ctx = createContext<WorkspaceValue | null>(null);

export function DealWorkspaceProvider({
  deal,
  data,
  custom,
  milestones = ALL_DONE,
  children,
}: {
  deal: Deal;
  data: DealWorkspaceData;
  custom?: CustomDeal;
  milestones?: Milestones;
  children: React.ReactNode;
}) {
  const { config } = usePricingConfig();
  const store = useMemo(() => decisionStore(deal.id), [deal.id]);
  const saved = usePersisted(store);
  const state = useMemo<DecisionState>(() => ({ ...initialDecisions(data, !!custom), ...saved }), [data, saved, custom]);

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
    const confidenceReasons = [...data.confidence.reasons];
    if (useClientVolume) confidenceReasons.unshift("Volume set to the client’s estimate, not what the ledger shows");
    const confidence: Confidence = useClientVolume ? "low" : data.confidence.level;
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
    const provider = data.currentProvider;
    const savings = provider
      ? compareSavings({
          current: state.currentFeeOverride ?? provider.monthlyFee,
          quotes,
          recommended: state.recommendedPackage,
          finalFee,
          cleanupFee: cleanup.fee,
          coveredToday: provider.services,
        })
      : null;
    const pending = state.status === "submitted" || state.status === "approved";
    const isStale =
      pending &&
      !!state.submittedQuote &&
      (state.submittedQuote.fee !== finalFee || state.submittedQuote.cleanup !== cleanup.fee);
    const liveStage: DealStage = deriveStage(deal.stage, milestones, state);
    const liveDeal: Deal = custom
      ? { ...deal, stage: liveStage, touchMinutes: touchMinutes(custom, state), monthlyFee: finalFee, cleanupFee: cleanup.fee }
      : deal;
    return {
      deal: liveDeal,
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
      savings,
    };
  }, [config, data, state, deal, custom, milestones]);

  const value = useMemo<WorkspaceValue>(
    () => ({ ...state, ...derived, data, custom, milestones, set, addEvent, resetDecisions, submit }),
    [state, derived, data, custom, milestones, set, addEvent, resetDecisions, submit],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDealWorkspace() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDealWorkspace must be used inside DealWorkspaceProvider");
  return ctx;
}
