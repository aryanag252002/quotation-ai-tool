import Link from "next/link";
import { ArrowRight, Clock, FileCheck2, Gauge, Plus, Timer, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader, SectionTitle } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { Pill } from "@/components/app/status";
import { ThroughputChart } from "@/components/dashboard/throughput-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDeals, getWeeklyThroughput } from "@/lib/data";
import { duration, STAGE_BY_ID, STAGES, SYSTEM_LABEL } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

const ATTENTION: Record<string, { action: string; href: (id: string) => string }> = {
  scope_review: { action: "Review scope & pricing", href: (id) => `/deals/${id}/scope` },
  pending_approval: { action: "Approve quote", href: (id) => `/deals/${id}/proposal` },
  brief_ready: { action: "Review pre-call brief", href: (id) => `/deals/${id}/brief` },
  awaiting_data: { action: "Nudge prospect for access", href: (id) => `/deals/${id}` },
};

export default async function DashboardPage() {
  const [deals, weekly] = await Promise.all([getDeals(), getWeeklyThroughput()]);
  const open = deals.filter((d) => !["won", "lost"].includes(d.stage));
  const attention = deals.filter((d) => d.stage in ATTENTION);
  const stageCounts = STAGES.map((s) => ({ ...s, count: deals.filter((d) => d.stage === s.id).length })).filter(
    (s) => s.count > 0,
  );

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
        <StatCard label="Open quotes" value={open.length} hint={`${attention.length} need your attention`} icon={FileCheck2} />
        <StatCard label="Win rate (90 days)" value="41%" hint="+9 pts since launch" icon={TrendingUp} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Needs your attention</CardTitle>
            <CardDescription>Exception-first: only quotes waiting on a human decision.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <ul className="divide-y">
              {attention.map((d) => {
                const a = ATTENTION[d.stage];
                const stage = STAGE_BY_ID[d.stage];
                return (
                  <li key={d.id}>
                    <Link
                      href={a.href(d.id)}
                      className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{d.prospect.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {SYSTEM_LABEL[d.system]} · {d.prospect.industryLabel}
                        </div>
                      </div>
                      <Pill tone={stage.tone} className="hidden sm:inline-flex">
                        {stage.label}
                      </Pill>
                      <span className="hidden items-center gap-1 text-xs text-muted-foreground md:inline-flex">
                        <Clock className="size-3.5" aria-hidden /> {duration(d.elapsedHours)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                        {a.action}
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pipeline by stage</CardTitle>
            <CardDescription>{deals.length} quotes in the last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {stageCounts.map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-sm">{s.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <div className="h-full rounded-full bg-chart-1" style={{ width: `${(s.count / deals.length) * 100}%` }} />
                </div>
                <span className="num w-6 text-right text-sm">{s.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

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
