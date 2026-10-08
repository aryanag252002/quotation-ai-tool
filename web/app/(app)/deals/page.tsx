import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { DealsTable } from "@/components/deals/deals-table";
import { Button } from "@/components/ui/button";
import { getDeals, getDealWorkspace, getUsers } from "@/lib/data";

export const metadata: Metadata = { title: "Quotes pipeline" };

export default async function DealsPage() {
  const [deals, users] = await Promise.all([getDeals(), getUsers()]);
  const workspaces = Object.fromEntries(
    await Promise.all(deals.filter((d) => d.hasFullData).map(async (d) => [d.id, await getDealWorkspace(d.id)] as const)),
  );
  return (
    <div className="space-y-5">
      <PageHeader
        title="Quotes pipeline"
        description="Every prospect from intake to signed proposal. Human time counts only active work on the quote."
        actions={
          <Button asChild>
            <Link href="/deals/new">
              <Plus /> New prospect
            </Link>
          </Button>
        }
      />
      <DealsTable deals={deals} users={users} workspaces={workspaces} />
    </div>
  );
}
