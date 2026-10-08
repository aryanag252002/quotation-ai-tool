import type { Metadata } from "next";
import { BriefView } from "@/components/deal/views/brief-view";

export const metadata: Metadata = { title: "Pre-call brief" };

export default function DealBriefPage() {
  return <BriefView />;
}
