import { describe, expect, it } from "vitest";
import { getDealWorkspace } from "@/lib/data";
import { generateWorkspace } from "@/lib/data/generate";
import { buildDocumentRequests, monthsBehind } from "@/lib/engine/requests";
import type { CustomDeal, DemoCondition } from "@/lib/types";

describe("buildDocumentRequests (Brightside)", async () => {
  const data = (await getDealWorkspace("brightside"))!;
  const reqs = buildDocumentRequests(data);
  const byId = Object.fromEntries(reqs.map((r) => [r.id, r]));

  it("asks for 7 months of statements for every bank and card account", () => {
    for (const a of data.accounts.filter((x) => x.kind === "bank" || x.kind === "card")) {
      expect(byId[`stmt-${a.id}`]).toMatchObject({ category: "statements", months: 7, period: "Mar 2026 – Sep 2026", priority: "cleanup" });
    }
  });

  it("asks for payout reports for never-reconciled clearing accounts", () => {
    const payouts = reqs.filter((r) => r.category === "processors");
    expect(payouts.map((r) => r.title)).toEqual(["Shopify payout reports", "Stripe payout reports"]);
    expect(payouts.every((r) => r.priority === "cleanup")).toBe(true);
  });

  it("covers suspense items, duplicates, undeposited funds, payroll, tax and OBE", () => {
    for (const id of ["txn-uncategorized", "txn-duplicates", "txn-undeposited", "txn-feed", "pay-registers", "tax-returns", "bal-ar", "bal-obe"]) {
      expect(byId[id], id).toBeDefined();
    }
    expect(byId["txn-uncategorized"].title).toContain("212");
    expect(byId["pay-registers"].title).toBe("Gusto payroll registers");
  });

  it("has unique ids and nothing marked received", () => {
    expect(new Set(reqs.map((r) => r.id)).size).toBe(reqs.length);
    expect(reqs.every((r) => !r.received)).toBe(true);
  });
});

describe("buildDocumentRequests (generated prospects)", () => {
  const deal = (condition: DemoCondition): CustomDeal => ({
    id: `req-${condition}`,
    createdAt: "2026-10-08T15:00:00Z",
    ownerId: "u1",
    prospect: { name: "Acme LLC", industry: "ecommerce", industryLabel: "E-commerce", location: "", website: "", contactName: "Sam Rivera", contactTitle: "CEO", contactEmail: "sam@acme.example" },
    system: "qbo",
    accessPath: "prospect_oauth",
    notes: "",
    profile: { size: "medium", condition, clientEstimate: null },
    progress: {},
  });

  it("only asks for the latest statements when books are current", () => {
    const data = generateWorkspace(deal("clean"));
    const statements = buildDocumentRequests(data).filter((r) => r.category === "statements");
    expect(statements.length).toBeGreaterThan(0);
    expect(statements.every((r) => r.months === 1 && r.priority === "monthly")).toBe(true);
  });

  it("requests one statement per month behind when books are messy", () => {
    const data = generateWorkspace(deal("messy"));
    const asOf = data.volumes.at(-1)!.month;
    const reqs = buildDocumentRequests(data);
    for (const a of data.accounts.filter((x) => x.kind === "bank" || x.kind === "card")) {
      expect(reqs.find((r) => r.id === `stmt-${a.id}`)?.months).toBe(monthsBehind(a, asOf));
    }
    expect(reqs.some((r) => r.id === "txn-uncategorized")).toBe(true);
  });
});
