import type { Metadata } from "next";
import { ScopeView } from "@/components/deal/views/scope-view";

export const metadata: Metadata = { title: "Scope" };

export default function DealScopePage() {
  return <ScopeView />;
}
