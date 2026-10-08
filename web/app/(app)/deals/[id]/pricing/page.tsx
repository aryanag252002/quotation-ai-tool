import type { Metadata } from "next";
import { PricingView } from "@/components/deal/views/pricing-view";

export const metadata: Metadata = { title: "Pricing" };

export default function DealPricingPage() {
  return <PricingView />;
}
