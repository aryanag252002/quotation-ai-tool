import type { Metadata } from "next";
import { StepGate } from "@/components/deal/step-gate";
import { MeetingView } from "@/components/deal/views/meeting-view";

export const metadata: Metadata = { title: "Consultation" };
// Prospects added during the demo render from browser storage, so the page isn't in the server render.
export const instant = false;

export default function DealMeetingPage() {
  return (
    <StepGate step="meeting">
      <MeetingView />
    </StepGate>
  );
}
