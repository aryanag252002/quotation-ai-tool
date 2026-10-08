import type { Metadata } from "next";
import { StepGate } from "@/components/deal/step-gate";
import { BriefView } from "@/components/deal/views/brief-view";

export const metadata: Metadata = { title: "Pre-call brief" };
// Prospects added during the demo render from browser storage, so the page isn't in the server render.
export const instant = false;

export default function DealBriefPage() {
  return (
    <StepGate step="brief">
      <BriefView />
    </StepGate>
  );
}
