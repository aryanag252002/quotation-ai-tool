"use client";

import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDealWorkspace } from "@/lib/state/deal-workspace";

export function ResetDemoButton() {
  const { resetDecisions } = useDealWorkspace();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        resetDecisions();
        toast.success("Demo reset", { description: "Scope, pricing and approval decisions restored to the AI draft." });
      }}
    >
      <RotateCcw /> Reset demo
    </Button>
  );
}
