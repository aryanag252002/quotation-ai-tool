import type { Metadata } from "next";
import { MeetingView } from "@/components/deal/views/meeting-view";

export const metadata: Metadata = { title: "Consultation" };

export default function DealMeetingPage() {
  return <MeetingView />;
}
