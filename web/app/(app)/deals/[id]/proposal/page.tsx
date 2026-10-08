import type { Metadata } from "next";
import { StepGate } from "@/components/deal/step-gate";
import { ProposalView } from "@/components/deal/views/proposal-view";

export const metadata: Metadata = { title: "Approval & proposal" };
// Prospects added during the demo render from browser storage, so the page isn't in the server render.
export const instant = false;

export default function DealProposalPage() {
  return (
    <StepGate step="proposal">
      <ProposalView />
    </StepGate>
  );
}
