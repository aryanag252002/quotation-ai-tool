import type { Metadata } from "next";
import { StepGate } from "@/components/deal/step-gate";
import { PricingView } from "@/components/deal/views/pricing-view";

export const metadata: Metadata = { title: "Pricing" };
// Prospects added during the demo render from browser storage, so the page isn't in the server render.
export const instant = false;

export default function DealPricingPage() {
  return (
    <StepGate step="pricing">
      <PricingView />
    </StepGate>
  );
}
