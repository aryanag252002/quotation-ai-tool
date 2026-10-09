import { describe, expect, it } from "vitest";
import { DEFAULT_PRICING_CONFIG } from "@/lib/config/defaults";
import { generateWorkspace, PORTAL_SPEND_QUESTION, shortName } from "@/lib/data/generate";
import { rateSignals, SIGNALS } from "@/lib/engine/analysis";
import { quoteCleanup, quotePackage, requiredServiceIds } from "@/lib/engine/pricing";
import type { CustomDeal, DemoCondition, DemoSize, Industry, LedgerSystem } from "@/lib/types";

const INDUSTRIES: Industry[] = ["ecommerce", "construction", "nonprofit", "professional_services", "healthcare", "real_estate", "logistics", "other"];
const SIZES: DemoSize[] = ["small", "medium", "large"];
const CONDITIONS: DemoCondition[] = ["clean", "behind", "messy"];

function deal(industry: Industry, size: DemoSize, condition: DemoCondition, system: LedgerSystem = "qbo"): CustomDeal {
  return {
    id: `acme-${industry}-${size}-${condition}-${system}`,
    createdAt: "2026-10-08T15:00:00Z",
    ownerId: "u1",
    prospect: { name: "Acme Widgets LLC", industry, industryLabel: industry, location: "", website: "", contactName: "Sam Rivera", contactTitle: "CEO", contactEmail: "sam@acme.example" },
    system,
    accessPath: "prospect_oauth",
    notes: "",
    profile: { size, condition, clientEstimate: null },
    progress: { connectedAt: "2026-10-08T15:10:00Z", analysedAt: "2026-10-08T15:11:00Z", transcriptAt: "2026-10-09T17:40:00Z", callStartedAt: "2026-10-09T17:00:00Z", callPlatform: "zoom" },
  };
}

describe("generateWorkspace", () => {
  it("is deterministic for the same prospect", () => {
    const d = deal("ecommerce", "medium", "behind");
    expect(generateWorkspace(d)).toEqual(generateWorkspace(d));
  });

  for (const industry of INDUSTRIES)
    for (const size of SIZES)
      for (const condition of CONDITIONS) {
        it(`produces a consistent workspace: ${industry} / ${size} / ${condition}`, () => {
          const w = generateWorkspace(deal(industry, size, condition));
          // every analysis signal is present
          expect(new Set(w.signals.map((s) => s.id))).toEqual(new Set(SIGNALS.map((s) => s.id)));
          expect(rateSignals(w.signals).every((s) => s.rag !== null || !s.rate)).toBe(true);
          // citations point at real transcript segments and questions
          const segs = new Set(w.transcript.map((s) => s.id));
          const cited = [...w.requirements.flatMap((r) => r.segmentIds), ...w.briefAnswers.flatMap((a) => a.segmentIds), ...w.scope.flatMap((l) => l.segmentIds ?? []), ...w.contradictions.flatMap((c) => c.segmentIds)];
          expect(cited.every((id) => segs.has(id))).toBe(true);
          const qs = new Set(w.briefQuestions.map((q) => q.id));
          expect(w.briefAnswers.every((a) => qs.has(a.questionId))).toBe(true);
          // services the data requires are scope lines
          const lines = new Set(w.scope.map((l) => l.serviceId));
          expect(requiredServiceIds(w.workloadDrivers).every((id) => lines.has(id))).toBe(true);
          // packages price in order
          const inScope = new Set(w.scope.filter((l) => l.included).map((l) => l.serviceId));
          const [e, g, p] = (["essential", "growth", "premium"] as const).map((id) => quotePackage(DEFAULT_PRICING_CONFIG, id, w.workloadDrivers, inScope).monthlyFee);
          expect(e).toBeGreaterThanOrEqual(DEFAULT_PRICING_CONFIG.minMonthlyFee);
          expect(e).toBeLessThanOrEqual(g);
          expect(g).toBeLessThanOrEqual(p);
          const cleanup = quoteCleanup(DEFAULT_PRICING_CONFIG, w.cleanupDrivers, w.workloadDrivers).fee;
          if (condition === "messy") expect(cleanup).toBeGreaterThan(0);
          // findings are split by statement, with headline figures for both
          expect(w.findings.every((f) => f.statement === "pl" || f.statement === "bs")).toBe(true);
          expect(w.financials.pl.figures).toHaveLength(4);
          expect(w.financials.bs.figures).toHaveLength(4);
          expect(w.financials.caveat === null).toBe(condition === "clean");
          // the previous provider costs more than the recommended package
          const recFee = quotePackage(DEFAULT_PRICING_CONFIG, w.recommendedPackage, w.workloadDrivers, new Set([...inScope, ...requiredServiceIds(w.workloadDrivers)])).monthlyFee;
          expect(w.currentProvider!.monthlyFee).toBeGreaterThan(recFee);
          expect(w.currentProvider!.segmentIds!.every((id) => segs.has(id))).toBe(true);
        });
      }

  it("scales cleanup with books condition", () => {
    const fee = (c: DemoCondition) => {
      const w = generateWorkspace(deal("ecommerce", "medium", c));
      return quoteCleanup(DEFAULT_PRICING_CONFIG, w.cleanupDrivers, w.workloadDrivers).fee;
    };
    expect(fee("clean")).toBeLessThan(fee("behind"));
    expect(fee("behind")).toBeLessThan(fee("messy"));
  });

  it("lowers confidence for file uploads and flags a volume contradiction", () => {
    const w = generateWorkspace(deal("other", "small", "behind", "upload"));
    expect(w.confidence.level).toBe("low");
    expect(w.contradictions).toHaveLength(1);
  });

  it("skips the contradiction when the client's estimate matches the ledger", () => {
    const base = generateWorkspace(deal("healthcare", "medium", "clean"));
    const d = deal("healthcare", "medium", "clean");
    d.profile.clientEstimate = base.workloadDrivers.bankCardTxns;
    expect(generateWorkspace(d).contradictions).toHaveLength(0);
  });

  it("shortens legal names", () => {
    expect(shortName("Acme Widgets LLC")).toBe("Acme Widgets");
    expect(shortName("Kestrel Logistics Inc.")).toBe("Kestrel Logistics");
  });

  it("uses the current spend the prospect gave in the portal", () => {
    const d = { ...deal("construction", "small", "behind"), portalAnswers: [{ q: PORTAL_SPEND_QUESTION, a: "$1,800" }] };
    const w = generateWorkspace(d);
    expect(w.currentProvider?.monthlyFee).toBe(1800);
    expect(w.currentProvider?.source).toBe("portal");
    expect(w.transcript.some((t) => t.text.includes("$1,800 a month"))).toBe(true);
  });
});
