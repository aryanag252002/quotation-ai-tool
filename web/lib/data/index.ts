/**
 * Service layer. Returns mock data today; each function maps 1:1 to a backend endpoint
 * (see docs/architecture.md §3), so swapping in the FastAPI client needs no UI changes.
 */
import * as brightside from "@/lib/data/mock/brightside";
import { deals, tenant, users, weeklyThroughput } from "@/lib/data/mock/pipeline";
import type { Deal, User } from "@/lib/types";

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

/** Everything the deal workspace needs. Only the Brightside demo deal has full data. */
export async function getDealWorkspace(id: string) {
  if (id !== "brightside") return null;
  const { clientStatedTxns, ...data } = brightside;
  return { ...data, clientStatedTxns };
}

export type DealWorkspaceData = NonNullable<Awaited<ReturnType<typeof getDealWorkspace>>>;
