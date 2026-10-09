"use client";

import { useMemo, useState } from "react";
import { Activity, Check, Gauge, Landmark, Layers, ReceiptText, TriangleAlert, Wrench, X } from "lucide-react";
import { SectionTitle } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { AiBadge, Pill, RagBadge } from "@/components/app/status";
import { BankCardChart, DocumentsChart } from "@/components/deal/volume-charts";
import { SignalEvidenceSheet } from "@/components/deal/signal-evidence-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  booksHealth,
  complexityTier,
  GROUP_LABELS,
  rateSignals,
  ragCounts,
  type RatedSignal,
} from "@/lib/engine/analysis";
import { hrs, usd } from "@/lib/format";
import { useDealWorkspace } from "@/lib/state/deal-workspace";
import { cn } from "@/lib/utils";
import type { Finding, SignalGroup, Statement } from "@/lib/types";

const SEVERITY_TONE = { high: "danger", medium: "warning", low: "neutral" } as const;

const STATEMENTS: Statement[] = ["pl", "bs"];
const STATEMENT_META: Record<Statement, { title: string; icon: typeof ReceiptText; empty: string }> = {
  pl: { title: "Profit & loss", icon: ReceiptText, empty: "No profit & loss issues found: income and expenses are categorised." },
  bs: { title: "Balance sheet", icon: Landmark, empty: "No balance sheet issues found: accounts are reconciled and balances look right." },
};

export function AnalysisView() {
  const { data, cleanup, drivers, findingStatus, set } = useDealWorkspace();
  const rated = useMemo(() => rateSignals(data.signals), [data.signals]);
  const byId = useMemo(() => Object.fromEntries(rated.map((s) => [s.id, s])), [rated]);
  const tier = complexityTier(rated);
  const health = booksHealth(rated);
  const [openSignal, setOpenSignal] = useState<RatedSignal | null>(null);

  const setFinding = (id: string, status: Finding["status"]) =>
    set("findingStatus", { ...findingStatus, [id]: status });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Sized monthly volume" value={drivers.bankCardTxns} hint="Bank + card transactions, seasonality-adjusted" icon={Activity} />
        <StatCard label="Books health" value={`${health.score}/100`} hint={health.label} icon={Gauge} />
        <StatCard label="Complexity" value={tier.tier} hint={`${tier.points} structure points`} icon={Layers} />
        <StatCard label="Cleanup estimate" value={hrs(cleanup.hours)} hint={`≈ ${usd(cleanup.fee)} one-time`} icon={Wrench} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <SectionTitle hint="24 months">Bank & card transactions</SectionTitle>
            <CardDescription>
              Dashed line = sized volume ({drivers.bankCardTxns}/mo): max(6-month average, 0.85 × 12-month p90), absorbing the holiday peak.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BankCardChart data={data.volumes} sized={drivers.bankCardTxns} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <SectionTitle hint="24 months">Invoices, bills & journal entries</SectionTitle>
            <CardDescription>Drives AR, AP and month-end close hours.</CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentsChart data={data.volumes} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Key findings <AiBadge label="AI explained" />
          </CardTitle>
          <CardDescription>
            Split by financial statement. The AI explains signals in plain language; it never computes the numbers.
            Accept or reject each finding before it can appear in the proposal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-0 px-0">
          {data.financials.caveat ? (
            <p className="mx-4 mb-3 flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {data.financials.caveat}
            </p>
          ) : null}
          <Tabs defaultValue="pl" className="gap-0">
            <TabsList variant="line" aria-label="Financial statement" className="w-full justify-start gap-2 border-b px-4 group-data-horizontal/tabs:h-11">
              {STATEMENTS.map((st) => {
                const meta = STATEMENT_META[st];
                const items = data.findings.filter((f) => f.statement === st);
                const high = items.filter((f) => f.severity === "high").length;
                return (
                  <TabsTrigger key={st} value={st} className="flex-none px-2">
                    <meta.icon aria-hidden />
                    {meta.title}
                    <span className="num rounded bg-muted px-1.5 text-[11px] text-muted-foreground">{items.length}</span>
                    {high ? (
                      <span className="num rounded bg-danger-soft px-1.5 text-[11px] text-danger" aria-label={`${high} high severity`}>
                        {high} high
                      </span>
                    ) : null}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {STATEMENTS.map((st) => {
              const meta = STATEMENT_META[st];
              const items = data.findings.filter((f) => f.statement === st);
              const fin = data.financials[st];
              return (
                <TabsContent key={st} value={st}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
                    <span>{"period" in fin ? fin.period : `As of ${fin.asOf}`}</span>
                    <span className="ml-auto">
                      {items.length} finding{items.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-px border-y bg-border lg:grid-cols-4">
                    {fin.figures.map((fig) => (
                      <div key={fig.label} className="space-y-0.5 bg-card px-4 py-3">
                        <dt className="text-xs text-muted-foreground">{fig.label}</dt>
                        <dd className="num text-lg font-semibold tracking-tight">{fig.value}</dd>
                        {fig.hint ? (
                          <dd
                            className={cn(
                              "flex items-start gap-1 text-xs",
                              fig.tone === "danger" ? "text-danger" : fig.tone === "warning" ? "text-warning" : "text-muted-foreground",
                            )}
                          >
                            {fig.tone ? <TriangleAlert className="mt-0.5 size-3 shrink-0" aria-hidden /> : null}
                            {fig.hint}
                          </dd>
                        ) : null}
                      </div>
                    ))}
                  </dl>
                  {items.length ? (
                    <ul className="divide-y">
                      {items.map((f) => (
                        <FindingRow
                          key={f.id}
                          finding={f}
                          status={findingStatus[f.id]}
                          onStatus={(next) => setFinding(f.id, next)}
                          onEvidence={(sid) => setOpenSignal(byId[sid])}
                        />
                      ))}
                    </ul>
                  ) : (
                    <p className="px-4 py-4 text-sm text-muted-foreground">{meta.empty}</p>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All signals</CardTitle>
          <CardDescription>35 deterministic checks from the analysis framework. Select a row to see its evidence.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="quality">
            <TabsList className="flex-wrap">
              {(Object.keys(GROUP_LABELS) as SignalGroup[]).map((g) => {
                const counts = ragCounts(rated.filter((s) => s.group === g));
                return (
                  <TabsTrigger key={g} value={g} className="gap-1.5">
                    {GROUP_LABELS[g]}
                    {counts.red ? <span className="num rounded bg-danger-soft px-1 text-[11px] text-danger">{counts.red}</span> : null}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {(Object.keys(GROUP_LABELS) as SignalGroup[]).map((g) => (
              <TabsContent key={g} value={g} className="mt-3">
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">ID</TableHead>
                        <TableHead>Signal</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead className="hidden md:table-cell">Thresholds</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden lg:table-cell">Effect on quote</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rated
                        .filter((s) => s.group === g)
                        .map((s) => (
                          <TableRow
                            key={s.id}
                            tabIndex={0}
                            onClick={() => setOpenSignal(s)}
                            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpenSignal(s))}
                            className="cursor-pointer focus-visible:bg-muted focus-visible:outline-none"
                          >
                            <TableCell className="num text-muted-foreground">{s.id}</TableCell>
                            <TableCell className="font-medium">{s.name}</TableCell>
                            <TableCell className="num">{s.value.display}</TableCell>
                            <TableCell className="num hidden text-muted-foreground md:table-cell">{s.thresholds}</TableCell>
                            <TableCell>
                              <RagBadge rag={s.rag} />
                            </TableCell>
                            <TableCell className="hidden text-muted-foreground lg:table-cell">{s.effect}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <SignalEvidenceSheet signal={openSignal} onOpenChange={(open) => !open && setOpenSignal(null)} />
    </div>
  );
}

function FindingRow({
  finding: f,
  status,
  onStatus,
  onEvidence,
}: {
  finding: Finding;
  status: Finding["status"] | undefined;
  onStatus: (status: Finding["status"]) => void;
  onEvidence: (signalId: string) => void;
}) {
  return (
    <li className={cn("flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start", status === "rejected" && "opacity-60")}>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={SEVERITY_TONE[f.severity]}>{f.severity}</Pill>
          <span className={cn("text-sm font-medium", status === "rejected" && "line-through")}>{f.title}</span>
        </div>
        <p className="text-sm text-muted-foreground">{f.detail}</p>
        <div className="flex flex-wrap gap-1.5">
          {f.signalIds.map((sid) => (
            <button
              key={sid}
              type="button"
              onClick={() => onEvidence(sid)}
              className="num rounded border px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {sid} · evidence
            </button>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <Button
          size="sm"
          variant={status === "accepted" ? "default" : "outline"}
          aria-pressed={status === "accepted"}
          onClick={() => onStatus(status === "accepted" ? "proposed" : "accepted")}
        >
          <Check /> {status === "accepted" ? "Accepted" : "Accept"}
        </Button>
        <Button
          size="sm"
          variant={status === "rejected" ? "secondary" : "ghost"}
          aria-pressed={status === "rejected"}
          onClick={() => onStatus(status === "rejected" ? "proposed" : "rejected")}
        >
          <X /> {status === "rejected" ? "Rejected" : "Reject"}
        </Button>
      </div>
    </li>
  );
}
