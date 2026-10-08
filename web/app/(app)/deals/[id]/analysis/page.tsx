import type { Metadata } from "next";
import { StepGate } from "@/components/deal/step-gate";
import { AnalysisView } from "@/components/deal/views/analysis-view";

export const metadata: Metadata = { title: "Analysis" };
// Prospects added during the demo render from browser storage, so the page isn't in the server render.
export const instant = false;

export default function DealAnalysisPage() {
  return (
    <StepGate step="analysis">
      <AnalysisView />
    </StepGate>
  );
}
