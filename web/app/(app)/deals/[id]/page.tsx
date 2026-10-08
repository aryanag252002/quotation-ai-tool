import type { Metadata } from "next";
import { StepGate } from "@/components/deal/step-gate";
import { DataAccessView } from "@/components/deal/views/data-access-view";

export const metadata: Metadata = { title: "Data access" };
// Prospects added during the demo render from browser storage, so the page isn't in the server render.
export const instant = false;

export default function DealDataAccessPage() {
  return (
    <StepGate step="data">
      <DataAccessView />
    </StepGate>
  );
}
