"use client";

import Link from "next/link";
import { useMemo } from "react";
import { SearchX } from "lucide-react";
import { CustomDealActions } from "@/components/deal/custom-deal-actions";
import { DealSkeleton } from "@/components/deal/deal-skeleton";
import { LiveDealHeader, LiveDealStepper } from "@/components/deal/live-progress";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useHydrated } from "@/hooks/use-hydrated";
import { generateWorkspace } from "@/lib/data/generate";
import { milestonesOf, toDeal, useCustomDeal } from "@/lib/state/custom-deals";
import { DealWorkspaceProvider } from "@/lib/state/deal-workspace";
import type { User } from "@/lib/types";

/** Workspace for a prospect added during the demo (stored in this browser). */
export function LocalDealShell({ id, users, children }: { id: string; users: User[]; children: React.ReactNode }) {
  const hydrated = useHydrated();
  const custom = useCustomDeal(id);
  const data = useMemo(() => (custom ? generateWorkspace(custom) : null), [custom]);
  const milestones = useMemo(() => (custom ? milestonesOf(custom) : undefined), [custom]);
  const deal = useMemo(() => (custom ? toDeal(custom) : null), [custom]);

  if (!hydrated) return <DealSkeleton />;
  if (!custom || !data || !deal) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SearchX className="size-4" aria-hidden /> Quote not found
          </CardTitle>
          <CardDescription>
            Prospects added in the demo are saved in the browser they were created in. This one isn’t here, or it was
            deleted.
          </CardDescription>
        </CardHeader>
        <CardFooter className="gap-2 border-t pt-4">
          <Button asChild>
            <Link href="/deals/new">Add a prospect</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/deals">Back to pipeline</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const owner = users.find((u) => u.id === custom.ownerId);
  return (
    <DealWorkspaceProvider deal={deal} data={data} custom={custom} milestones={milestones}>
      <div className="space-y-5">
        <div className="space-y-5 print:hidden">
          <LiveDealHeader owner={owner} actions={<CustomDealActions />} />
          <LiveDealStepper />
        </div>
        <div>{children}</div>
      </div>
    </DealWorkspaceProvider>
  );
}
