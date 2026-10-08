/**
 * Service layer. Returns mock data today; each function maps 1:1 to a backend endpoint
 * (see docs/architecture.md §3), so swapping in the FastAPI client needs no UI changes.
 */
import * as brightside from "@/lib/data/mock/brightside";
import { deals, tenant, users, weeklyThroughput } from "@/lib/data/mock/pipeline";
import type { Deal, DealWorkspaceData, User } from "@/lib/types";

export type { DealWorkspaceData } from "@/lib/types";

export async function getTenant() {
  return tenant;
}

export async function getUsers(): Promise<User[]> {
  return users;
}

export async function getDeals(): Promise<Deal[]> {
  return deals;
}

export async function getDeal(id: string): Promise<Deal | undefined> {
  return deals.find((d) => d.id === id);
}

export async function getWeeklyThroughput() {
  return weeklyThroughput;
}

/**
 * Everything the deal workspace needs. Of the seeded deals only Brightside has full data;
 * prospects added during a demo are generated in the browser (see lib/data/generate.ts).
 */
export async function getDealWorkspace(id: string): Promise<DealWorkspaceData | null> {
  if (id !== "brightside") return null;
  return { ...brightside };
}
