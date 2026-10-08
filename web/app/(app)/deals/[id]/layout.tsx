import { Suspense } from "react";
import { DealHeader } from "@/components/deal/deal-header";
import { DealStepper } from "@/components/deal/deal-stepper";
import { DealSkeleton } from "@/components/deal/deal-skeleton";
import { LimitedDeal } from "@/components/deal/limited-deal";
import { LiveDealHeader, LiveDealStepper } from "@/components/deal/live-progress";
import { LocalDealShell } from "@/components/deal/local-deal-shell";
import { ResetDemoButton } from "@/components/deal/reset-demo-button";
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
  // Prospects added during the demo live in the browser, not on the server.
  if (!deal) return <LocalDealShell id={id} users={users}>{children}</LocalDealShell>;
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
          <LiveDealHeader owner={owner} actions={<ResetDemoButton />} />
          <LiveDealStepper />
        </div>
        <div>{children}</div>
      </div>
    </DealWorkspaceProvider>
  );
}
