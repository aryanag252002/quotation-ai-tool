"use client";

/**
 * Prospects added during a demo. Stored in this browser only (no backend yet), so the
 * prospect portal opened in another tab updates the same deal live via storage events.
 */
import { useMemo } from "react";
import { decisionStore, deriveStage, type DecisionState, type Milestones } from "@/lib/state/decisions";
import { persistedStore, usePersisted } from "@/lib/state/persisted-store";
import type { CustomDeal, CustomDealProgress, Deal } from "@/lib/types";

const store = persistedStore<CustomDeal[]>("quoteiq.custom-deals.v1", [], Array.isArray);

export function useCustomDeals() {
  return usePersisted(store);
}

export function useCustomDeal(id: string) {
  const deals = useCustomDeals();
  return useMemo(() => deals.find((d) => d.id === id), [deals, id]);
}

export function addCustomDeal(deal: CustomDeal) {
  store.set((prev) => [deal, ...prev.filter((d) => d.id !== deal.id)]);
}

export function updateCustomDeal(id: string, fn: (d: CustomDeal) => CustomDeal) {
  store.set((prev) => prev.map((d) => (d.id === id ? fn(d) : d)));
}

export function updateProgress(id: string, patch: Partial<CustomDealProgress>) {
  updateCustomDeal(id, (d) => ({ ...d, progress: { ...d.progress, ...patch } }));
}

/** Back to "awaiting data" with no analyst decisions. */
export function restartCustomDeal(id: string) {
  decisionStore(id).clear();
  updateCustomDeal(id, (d) => ({ ...d, progress: {}, portalAnswers: undefined }));
}

export function removeCustomDeal(id: string) {
  decisionStore(id).clear();
  store.set((prev) => prev.filter((d) => d.id !== id));
}

export function milestonesOf(d: CustomDeal): Milestones {
  return {
    simulated: true,
    connected: !!d.progress.connectedAt,
    analysed: !!d.progress.analysedAt,
    callHeld: !!d.progress.transcriptAt,
  };
}

/** Human minutes so far: intake, brief review, scheduling, transcript review, pricing, approval. */
export function touchMinutes(d: CustomDeal, decisions: Partial<DecisionState>) {
  const m = milestonesOf(d);
  return (
    2 +
    (decisions.briefReviewed ? 8 : 0) +
    (decisions.scheduledCall ? 1 : 0) +
    (m.callHeld ? 6 : 0) +
    (decisions.status && decisions.status !== "draft" ? 12 : 0) +
    (decisions.events ?? []).filter((e) => e.action !== "submitted").length * 3
  );
}

/** Pipeline row for a demo prospect. Reads its saved decisions and the clock (browser only). */
export function toDeal(d: CustomDeal): Deal {
  const now = Date.now();
  const decisions = decisionStore(d.id).get();
  return {
    id: d.id,
    prospect: d.prospect,
    system: d.system,
    stage: deriveStage("intake", milestonesOf(d), decisions),
    ownerId: d.ownerId,
    createdAt: d.createdAt,
    monthlyFee: decisions.submittedQuote?.fee,
    cleanupFee: decisions.submittedQuote?.cleanup,
    touchMinutes: touchMinutes(d, decisions),
    elapsedHours: Math.max(0, (now - new Date(d.createdAt).getTime()) / 3_600_000),
    hasFullData: true,
  };
}

/** Seeded deals plus prospects added in this browser (newest first). */
export function useAllDeals(seed: Deal[]) {
  const custom = useCustomDeals();
  return useMemo(() => {
    // Custom deals exist only in the browser, so the clock is never read during prerender.
    if (!custom.length) return seed;
    return [...custom.map((c) => toDeal(c)), ...seed];
  }, [custom, seed]);
}
