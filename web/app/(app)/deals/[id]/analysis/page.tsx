import type { Metadata } from "next";
import { AnalysisView } from "@/components/deal/views/analysis-view";

export const metadata: Metadata = { title: "Analysis" };

export default function DealAnalysisPage() {
  return <AnalysisView />;
}
