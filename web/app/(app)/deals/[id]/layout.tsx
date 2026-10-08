import { Suspense } from "react";
import { notFound } from "next/navigation";
import { DealHeader } from "@/components/deal/deal-header";
import { DealStepper } from "@/components/deal/deal-stepper";
import { LimitedDeal } from "@/components/deal/limited-deal";
import { LiveDealStepper, LiveStagePill } from "@/components/deal/live-progress";
import { ResetDemoButton } from "@/components/deal/reset-demo-button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDeal, getDeals, getDealWorkspace, getUsers } from "@/lib/data";
import { DealWorkspaceProvider } from "@/lib/state/deal-workspace";

export async function generateStaticParams() {
  const deals = await getDeals();
  return deals.map((d) => ({ id: d.id }));
}

// Not async: params are awaited inside the Suspense boundary so the shell renders instantly.
export default function DealLayout({ children, params }: LayoutProps<"/deals/[id]">) {
  return (
    <Suspense fallback={<DealSkeleton />}>
      {params.then(({ id }) => (
        <DealShell id={id}>{children}</DealShell>
      ))}
    </Suspense>
  );
}

async function DealShell({ id, children }: { id: string; children: React.ReactNode }) {
  const [deal, workspace, users] = await Promise.all([getDeal(id), getDealWorkspace(id), getUsers()]);
  if (!deal) notFound();
  const owner = users.find((u) => u.id === deal.ownerId);

  if (!workspace) {
    return (
      <div className="space-y-5">
        <DealHeader deal={deal} owner={owner} />
        <DealStepper dealId={deal.id} stage={deal.stage} />
        <LimitedDeal />
      </div>
    );
  }

  return (
    <DealWorkspaceProvider deal={deal} data={workspace}>
      <div className="space-y-5">
        <div className="space-y-5 print:hidden">
          <DealHeader deal={deal} owner={owner} actions={<ResetDemoButton />} stageSlot={<LiveStagePill />} />
          <LiveDealStepper />
        </div>
        <div>{children}</div>
      </div>
    </DealWorkspaceProvider>
  );
}

function DealSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading quote">
      <Skeleton className="h-14 w-2/3" />
      <Skeleton className="h-11 w-full" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 lg:col-span-2" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
