"use client";

import Link from "next/link";
import { Database, MessageSquareText, PiggyBank, UserPen } from "lucide-react";
import { Pill } from "@/components/app/status";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePricingConfig } from "@/lib/config/pricing-config-context";
import { clock, pct, usd } from "@/lib/format";
import { useDealWorkspace } from "@/lib/state/deal-workspace";
import { cn } from "@/lib/utils";

const SOURCE = {
  ledger: { label: "Found in ledger", icon: Database },
  portal: { label: "From prospect portal", icon: UserPen },
  call: { label: "From the call", icon: MessageSquareText },
} as const;

/** Pricing step: what the prospect pays today vs the recommended package. */
export function SavingsCard() {
  const { config } = usePricingConfig();
  const ws = useDealWorkspace();
  const { savings, data, deal, set } = ws;
  const provider = data.currentProvider;
  if (!provider || !savings) return null;

  const rec = config.packages.find((p) => p.id === ws.recommendedPackage)!;
  const edited = ws.currentFeeOverride !== null && ws.currentFeeOverride !== provider.monthlyFee;
  const saves = savings.monthly > 0;
  const max = Math.max(savings.current, savings.ours, 1);
  const source = SOURCE[provider.source];
  const segStart = Object.fromEntries(data.transcript.map((s) => [s.id, s.start]));
  const coveredNames = provider.services.map((id) => config.services.find((s) => s.id === id)?.name ?? id);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <PiggyBank className="size-4 text-muted-foreground" aria-hidden />
          Compared with what they pay today
        </CardTitle>
        <CardDescription>
          Shows the prospect what they save by switching. Correct the current cost if the call revealed a different figure.
        </CardDescription>
        <CardAction className="flex items-center gap-2">
          <Switch id="show-savings" checked={ws.showSavings} onCheckedChange={(v) => set("showSavings", v)} />
          <Label htmlFor="show-savings" className="text-sm font-normal">
            Show in proposal
          </Label>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="current-fee">Today: {provider.name} (per month)</Label>
            <div className="flex gap-2">
              <Input
                id="current-fee"
                type="number"
                inputMode="numeric"
                min={0}
                step={50}
                className="num"
                value={ws.currentFeeOverride ?? provider.monthlyFee}
                onChange={(e) => {
                  const v = e.target.value === "" ? null : Number(e.target.value);
                  set("currentFeeOverride", v === provider.monthlyFee ? null : v);
                }}
              />
              <Button variant="outline" disabled={!edited} onClick={() => set("currentFeeOverride", null)}>
                Reset
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Pill icon={edited ? UserPen : source.icon} tone={edited ? "warning" : "info"}>
              {edited ? "Edited by analyst" : source.label}
            </Pill>
            {provider.segmentIds?.map((s) => (
              <Link
                key={s}
                href={`/deals/${deal.id}/meeting`}
                className="num inline-flex h-6 items-center rounded-md border px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                Confirmed on call {clock(segStart[s] ?? 0)}
              </Link>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{provider.evidence}</p>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Covers today:</span> {coveredNames.join(", ")}
          </p>
        </div>

        <div className="space-y-4">
          <Bar label={`Today · ${provider.name}`} value={savings.current} width={savings.current / max} className="bg-muted-foreground/40" />
          <Bar label={`${rec.name} with us`} value={savings.ours} width={savings.ours / max} className="bg-primary" />
          {savings.added.length ? (
            <div className="space-y-1.5">
              <div className="text-xs font-medium">Included that they don’t get today</div>
              <div className="flex flex-wrap gap-1">
                {savings.added.map((a) => (
                  <Pill key={a.id} tone="success">
                    + {a.name}
                  </Pill>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <dl className={cn("grid grid-cols-2 gap-3 rounded-lg p-4 ring-1", saves ? "bg-success-soft ring-success/20" : "bg-warning-soft ring-warning/25")}>
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">{saves ? "Monthly saving" : "Costs more per month"}</dt>
            <dd className={cn("num text-3xl font-semibold tracking-tight", saves ? "text-success" : "text-warning")}>
              {usd(Math.abs(savings.monthly))}
              <span className="ml-2 text-sm font-medium">{saves ? `${pct(savings.pct)} less` : `${pct(-savings.pct)} more`}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{saves ? "Per year" : "Extra per year"}</dt>
            <dd className="num font-semibold">{usd(Math.abs(savings.annual))}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">First year, after cleanup</dt>
            <dd className="num font-semibold">{savings.firstYear < 0 ? `−${usd(-savings.firstYear)}` : usd(savings.firstYear)}</dd>
          </div>
          <div className="col-span-2 text-xs text-muted-foreground">
            {saves
              ? savings.paybackMonths
                ? `The ${usd(ws.cleanup.fee)} cleanup is paid back by savings in ${savings.paybackMonths} month${savings.paybackMonths > 1 ? "s" : ""}.`
                : "No cleanup to pay back; savings start in month one."
              : `Position on value: ${savings.added.length} more service${savings.added.length === 1 ? "" : "s"} and a faster close. Consider hiding savings from the proposal.`}
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function Bar({ label, value, width, className }: { label: string; value: number; width: number; className: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="truncate text-muted-foreground">{label}</span>
        <span className="num font-medium">{usd(value)} / mo</span>
      </div>
      <div className="h-2.5 rounded-full bg-muted" aria-hidden>
        <div className={cn("h-full rounded-full transition-[width] duration-300", className)} style={{ width: `${Math.max(2, width * 100)}%` }} />
      </div>
    </div>
  );
}
