import type { Metadata } from "next";
import { StepGate } from "@/components/deal/step-gate";
import { RequestsView } from "@/components/deal/views/requests-view";

export const metadata: Metadata = { title: "Document request" };
// Prospects added during the demo render from browser storage, so the page isn't in the server render.
export const instant = false;

export default function DealRequestsPage() {
  return (
    <StepGate step="requests">
      <RequestsView />
    </StepGate>
  );
}
