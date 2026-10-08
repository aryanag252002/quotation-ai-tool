import Link from "next/link";
import { Gauge, Plus, Timer, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader, SectionTitle } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { OpenQuotesStat, PipelineOverview } from "@/components/dashboard/pipeline-overview";
import { ThroughputChart } from "@/components/dashboard/throughput-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { getDeals, getWeeklyThroughput } from "@/lib/data";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [deals, weekly] = await Promise.all([getDeals(), getWeeklyThroughput()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Good morning, Priya"
        description="Here is where your quotes stand today."
        actions={
          <Button asChild>
            <Link href="/deals/new">
              <Plus /> New prospect
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Human time per quote" value="39 min" hint="Target ≤ 45 min · was ~1.5 days" icon={Timer} />
        <StatCard label="Transcript → draft quote" value="2m 14s" hint="Median, last 30 days" icon={Gauge} />
        <OpenQuotesStat deals={deals} />
        <StatCard label="Win rate (90 days)" value="41%" hint="+9 pts since launch" icon={TrendingUp} />
      </div>

      <PipelineOverview deals={deals} />

      <Card>
        <CardHeader>
          <SectionTitle hint="Last 8 weeks">Throughput and human effort</SectionTitle>
          <CardDescription>QuoteIQ went live on Sep 1. Average human time per quote fell from ~5 hours of active work to under 45 minutes.</CardDescription>
        </CardHeader>
        <CardContent>
          <ThroughputChart data={weekly} />
        </CardContent>
      </Card>
    </div>
  );
}
