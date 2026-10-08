import type { Metadata } from "next";
import { StepGate } from "@/components/deal/step-gate";
import { ScopeView } from "@/components/deal/views/scope-view";

export const metadata: Metadata = { title: "Scope" };
// Prospects added during the demo render from browser storage, so the page isn't in the server render.
export const instant = false;

export default function DealScopePage() {
  return (
    <StepGate step="scope">
      <ScopeView />
    </StepGate>
  );
}
