"use client";

import Link from "next/link";
import { ArrowRight, Clock, FileCheck2 } from "lucide-react";
import { StatCard } from "@/components/app/stat-card";
import { Pill } from "@/components/app/status";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { duration, STAGE_BY_ID, STAGES, SYSTEM_LABEL } from "@/lib/format";
import { useAllDeals } from "@/lib/state/custom-deals";
import type { Deal } from "@/lib/types";

const ATTENTION: Record<string, { action: string; href: (id: string) => string }> = {
  scope_review: { action: "Review scope & pricing", href: (id) => `/deals/${id}/scope` },
  pending_approval: { action: "Approve quote", href: (id) => `/deals/${id}/proposal` },
  brief_ready: { action: "Review pre-call brief", href: (id) => `/deals/${id}/brief` },
  awaiting_data: { action: "Nudge prospect for access", href: (id) => `/deals/${id}` },
};

const isOpen = (d: Deal) => !["won", "lost"].includes(d.stage);

export function OpenQuotesStat({ deals: seed }: { deals: Deal[] }) {
  const deals = useAllDeals(seed);
  const open = deals.filter(isOpen);
  const attention = deals.filter((d) => d.stage in ATTENTION);
  return <StatCard label="Open quotes" value={open.length} hint={`${attention.length} need your attention`} icon={FileCheck2} />;
}

export function PipelineOverview({ deals: seed }: { deals: Deal[] }) {
  const deals = useAllDeals(seed);
  const attention = deals.filter((d) => d.stage in ATTENTION);
  const stageCounts = STAGES.map((s) => ({ ...s, count: deals.filter((d) => d.stage === s.id).length })).filter(
    (s) => s.count > 0,
  );

  return (
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
  );
}
