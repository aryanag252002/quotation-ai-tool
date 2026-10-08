import type { Metadata } from "next";
import { ProposalView } from "@/components/deal/views/proposal-view";

export const metadata: Metadata = { title: "Approval & proposal" };

export default function DealProposalPage() {
  return <ProposalView />;
}
