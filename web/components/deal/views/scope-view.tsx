"use client";

import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { toast } from "sonner";
import { ConfidenceBadge, SourceBadge } from "@/components/app/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePricingConfig } from "@/lib/config/pricing-config-context";
import { serviceHours } from "@/lib/engine/pricing";
import { clock, hrs } from "@/lib/format";
import { buildAssumptions } from "@/components/deal/assumptions";
import { useDealWorkspace } from "@/lib/state/deal-workspace";
import { cn } from "@/lib/utils";

export function ScopeView() {
  const { config } = usePricingConfig();
  const { deal, data, scopeIncluded, required, drivers, multiplier, quotes, recommendedPackage, set } = useDealWorkspace();
  const serviceById = Object.fromEntries(config.services.map((s) => [s.id, s]));
  const segStart = Object.fromEntries(data.transcript.map((s) => [s.id, s.start]));
  const inScopeCount = data.scope.filter((l) => scopeIncluded[l.serviceId] || required.has(l.serviceId)).length;

  const assumptions = buildAssumptions(drivers, scopeIncluded);

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Scope of work</CardTitle>
          <CardDescription>
            Merged from the data, the call and analyst judgement. {inScopeCount} services in scope. Services the data
            proves are needed are locked into every package.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14 pl-4">In scope</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="hidden lg:table-cell">Packages</TableHead>
                  <TableHead className="pr-4 text-right">Hours / mo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.scope.map((line) => {
                  const svc = serviceById[line.serviceId];
                  const isRequired = required.has(line.serviceId);
                  const included = isRequired || scopeIncluded[line.serviceId];
                  const h = serviceHours(svc, drivers, multiplier.applied).hours;
                  return (
                    <TableRow key={line.serviceId} className={cn(!included && "text-muted-foreground")}>
                      <TableCell className="pl-4 align-top">
                        {isRequired ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex h-6 items-center" tabIndex={0} aria-label="Required by data">
                                <Lock className="size-4 text-muted-foreground" aria-hidden />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Required by data: included in every package</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Switch
                            checked={included}
                            aria-label={`Include ${svc.name}`}
                            onCheckedChange={(v) => {
                              set("scopeIncluded", { ...scopeIncluded, [line.serviceId]: v });
                              toast.info(`${svc.name} ${v ? "added to" : "removed from"} scope`, { description: "Packages re-priced." });
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell className="max-w-md align-top whitespace-normal">
                        <div className={cn("font-medium", included && "text-foreground")}>{svc.name}</div>
                        <div className="text-xs text-muted-foreground">{line.rationale}</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {line.signalIds?.map((s) => (
                            <span key={s} className="num rounded border px-1.5 text-[11px] text-muted-foreground">{s}</span>
                          ))}
                          {line.segmentIds?.map((s) => (
                            <Link
                              key={s}
                              href={`/deals/${deal.id}/meeting`}
                              className="num rounded border px-1.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              call {clock(segStart[s])}
                            </Link>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-col items-start gap-1">
                          <SourceBadge source={line.source} />
                          {line.confidence !== "high" ? <ConfidenceBadge confidence={line.confidence} /> : null}
                        </div>
                      </TableCell>
                      <TableCell className="hidden align-top lg:table-cell">
                        <div className="flex gap-1">
                          {config.packages.map((p) => {
                            const inPkg = isRequired || p.services.includes(line.serviceId);
                            return (
                              <span
                                key={p.id}
                                title={`${p.name}: ${inPkg ? "included" : "not included"}`}
                                className={cn(
                                  "inline-flex size-6 items-center justify-center rounded text-[11px] font-semibold",
                                  inPkg && included ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                                )}
                              >
                                {p.name[0]}
                                <span className="sr-only">{inPkg ? " included" : " not included"}</span>
                              </span>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="num pr-4 text-right align-top">
                        {svc.billing === "annual" ? <span title="Annual, shown per month">{hrs(h)}*</span> : hrs(h)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="px-4 pt-3 text-xs text-muted-foreground">* Annual service shown as a monthly equivalent. E / G / P = Essential, Growth, Premium.</p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Recommended package</CardTitle>
            <CardDescription>Based on what the client asked for on the call.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {config.packages.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => set("recommendedPackage", p.id)}
                aria-pressed={recommendedPackage === p.id}
                className={cn(
                  "flex w-full items-center justify-between rounded-md border p-2.5 text-left text-sm transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  recommendedPackage === p.id ? "border-primary bg-accent" : "hover:bg-muted",
                )}
              >
                <span className="font-medium">{p.name}</span>
                <span className="num text-muted-foreground">{hrs(quotes[p.id].totalHours)} / mo</span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Complexity multiplier</CardTitle>
            <CardDescription>Applied to transactional (L1) services.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {multiplier.parts.map((p) => (
              <div key={p.label} className="flex justify-between gap-2">
                <span>{p.label}</span>
                <span className="num">×{p.factor.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between gap-2 border-t pt-1.5 font-medium">
              <span>Applied{multiplier.capped ? " (capped)" : ""}</span>
              <span className="num">×{multiplier.applied.toFixed(3)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assumptions</CardTitle>
            <CardDescription>Printed in the proposal.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1.5 pl-4 text-sm">
              {assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Changes re-price instantly</span>
          <Button asChild>
            <Link href={`/deals/${deal.id}/pricing`}>
              Continue to pricing <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
