"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Info, ShieldAlert, ShieldCheck, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { ConfidenceBadge, Pill } from "@/components/app/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { usePricingConfig } from "@/lib/config/pricing-config-context";
import { priceRate, type PackageQuote } from "@/lib/engine/pricing";
import { hrs, pct, ROLE_LABEL, usd } from "@/lib/format";
import { useDealWorkspace } from "@/lib/state/deal-workspace";
import { cn } from "@/lib/utils";
import type { CleanupDrivers, OverrideReason, PackageId } from "@/lib/types";

const REASONS: Record<OverrideReason, string> = {
  competitive: "Competitive pressure",
  strategic: "Strategic client",
  referral: "Referral partner",
  scope_uncertainty: "Scope uncertainty",
  other: "Other",
};

export function PricingView() {
  const { config } = usePricingConfig();
  const router = useRouter();
  const ws = useDealWorkspace();
  const { quotes, cleanup, recommendedPackage, approval, engineFee, finalFee, confidence, confidenceReasons, set, deal } = ws;
  const overridden = ws.overrideFee !== null && ws.overrideFee !== engineFee;
  const needsReason = overridden && !ws.overrideReason;
  const ApprovalIcon = approval.level === "analyst" ? UserCheck : approval.level === "manager" ? ShieldCheck : ShieldAlert;

  const submit = () => {
    if (needsReason) {
      toast.error("Choose an override reason", { description: "Every price override needs a reason code." });
      return;
    }
    const quote = { fee: finalFee, cleanup: cleanup.fee };
    if (approval.level === "analyst") {
      ws.submit({ by: "Priya Sharma", note: "Within analyst limits", approved: true, quote });
      toast.success("Quote ready to send", { description: "Within analyst limits, so no further approval is needed." });
    } else {
      ws.submit({ by: "Priya Sharma", note: approval.reasons.join(" · "), approved: false, quote });
      toast.success(`Sent to ${approval.level} for approval`, { description: approval.reasons.join(" · ") });
    }
    router.push(`/deals/${deal.id}/proposal`);
  };

  return (
    <div className="space-y-4">
      <Card className="bg-muted/40">
        <CardContent className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Info className="size-4 text-primary" aria-hidden /> Deterministic pricing
          </div>
          <code className="num flex-1 overflow-x-auto rounded-md bg-card px-3 py-2 text-xs whitespace-nowrap ring-1 ring-border">
            hours = Σ(driver × time standard) × multiplier + {pct(config.reviewPct)} review + {config.clientManagementHours} h management → fee = Σ(role hours × rate) ↑ ${config.roundMonthlyTo}
          </code>
          <Button asChild variant="outline" size="sm">
            <Link href="/settings">Edit standards & rates</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        {config.packages.map((p) => {
          const q = quotes[p.id];
          const isRec = recommendedPackage === p.id;
          return (
            <Card key={p.id} className={cn("relative", isRec && "ring-2 ring-primary")}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  {p.name}
                  {isRec ? <Pill tone="info">Recommended</Pill> : null}
                </CardTitle>
                <CardDescription>{p.tagline}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <div>
                  <span className="num text-3xl font-semibold tracking-tight">{usd(isRec ? finalFee : q.monthlyFee)}</span>
                  <span className="text-sm text-muted-foreground"> / month</span>
                  {isRec && overridden ? (
                    <div className="num text-xs text-muted-foreground line-through">{usd(engineFee)} engine</div>
                  ) : null}
                </div>
                <dl className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Hours</dt>
                    <dd className="num font-medium">{hrs(q.totalHours)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Margin</dt>
                    <dd className="num font-medium">{pct(isRec ? approval.margin : q.margin, 1)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Close by</dt>
                    <dd className="num font-medium">Day {p.closeDay}</dd>
                  </div>
                </dl>
                <ul className="space-y-1 text-sm">
                  {q.services.map((s) => (
                    <li key={s.service.id} className="flex items-start gap-1.5">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden /> {s.service.name}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="border-t bg-muted/40 py-3">
                <Button
                  variant={isRec ? "secondary" : "outline"}
                  size="sm"
                  className="w-full"
                  disabled={isRec}
                  onClick={() => set("recommendedPackage", p.id)}
                >
                  {isRec ? "Recommended in proposal" : "Make recommended"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Calculation</CardTitle>
            <CardDescription>Every line is reproducible from the drivers and the rate card ({config.version}).</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={recommendedPackage} key={recommendedPackage}>
              <TabsList>
                {config.packages.map((p) => (
                  <TabsTrigger key={p.id} value={p.id}>
                    {p.name}
                  </TabsTrigger>
                ))}
                <TabsTrigger value="cleanup">Cleanup</TabsTrigger>
              </TabsList>
              {config.packages.map((p) => (
                <TabsContent key={p.id} value={p.id} className="mt-3">
                  <BreakdownTable quote={quotes[p.id]} packageId={p.id} />
                </TabsContent>
              ))}
              <TabsContent value="cleanup" className="mt-3">
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cleanup task</TableHead>
                        <TableHead>Quantity × standard</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cleanup.lines.map((l) => (
                        <TableRow key={l.label}>
                          <TableCell>{l.label}</TableCell>
                          <TableCell className="num text-muted-foreground">{l.quantity}</TableCell>
                          <TableCell className="num text-right">{hrs(l.hours)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={2}>
                          {hrs(cleanup.hours)} × {usd(cleanup.blendedRate)}/h blended × {(1 + config.cleanup.premium).toFixed(2)} → rounded to ${config.roundCleanupTo}
                        </TableCell>
                        <TableCell className="num text-right font-semibold">{usd(cleanup.fee)}</TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>One-time cleanup</CardTitle>
              <CardDescription>{cleanupSummary(ws.data.cleanupDrivers)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="num text-2xl font-semibold">{cleanup.fee > 0 ? usd(cleanup.fee) : "Not needed"}</div>
              <div className="text-xs text-muted-foreground">
                {cleanup.fee > 0 ? `${hrs(cleanup.hours)} · 50% upfront, 50% on completion` : "Books are current; monthly service starts straight away"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                Data confidence <ConfidenceBadge confidence={confidence} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                {confidenceReasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <RadioGroup value={ws.protection} onValueChange={(v) => set("protection", v as "true_up" | "contingency")} aria-label="Protection for uncertain drivers">
                <Label className="flex cursor-pointer items-start gap-2 text-sm font-normal">
                  <RadioGroupItem value="true_up" className="mt-0.5" />
                  <span>
                    90-day true-up clause <span className="text-muted-foreground">(price reviewed after 3 months of actuals)</span>
                  </span>
                </Label>
                <Label className="flex cursor-pointer items-start gap-2 text-sm font-normal">
                  <RadioGroupItem value="contingency" className="mt-0.5" />
                  <span>
                    +{pct(config.contingencyPct)} contingency <span className="text-muted-foreground">(built into the monthly fee)</span>
                  </span>
                </Label>
              </RadioGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Price override</CardTitle>
              <CardDescription>Optional. Overrides need a reason code and may change who approves.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="override">Final monthly fee ({config.packages.find((p) => p.id === recommendedPackage)?.name})</Label>
                <div className="flex gap-2">
                  <Input
                    id="override"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={50}
                    value={ws.overrideFee ?? engineFee}
                    onChange={(e) => {
                      const v = e.target.value === "" ? null : Number(e.target.value);
                      set("overrideFee", v === engineFee ? null : v);
                    }}
                    className="num"
                  />
                  <Button variant="outline" disabled={!overridden} onClick={() => { set("overrideFee", null); set("overrideReason", null); }}>
                    Reset
                  </Button>
                </div>
                {overridden ? (
                  <p className="num text-xs text-muted-foreground">
                    {approval.overridePct > 0 ? "+" : ""}
                    {approval.overridePct.toFixed(1)}% vs engine ({usd(engineFee)})
                  </p>
                ) : null}
              </div>
              {overridden ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="reason">Reason</Label>
                    <Select value={ws.overrideReason ?? undefined} onValueChange={(v) => set("overrideReason", v as OverrideReason)}>
                      <SelectTrigger id="reason" className="w-full" aria-invalid={needsReason}>
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(REASONS) as OverrideReason[]).map((r) => (
                          <SelectItem key={r} value={r}>
                            {REASONS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {needsReason ? <p className="text-xs text-destructive">A reason is required for any override.</p> : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="note">Note for approver</Label>
                    <Textarea id="note" value={ws.overrideNote} onChange={(e) => set("overrideNote", e.target.value)} placeholder="Why this price?" />
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card className={cn(approval.level === "partner" ? "ring-danger/40" : approval.level === "manager" ? "ring-warning/40" : "ring-success/40", "ring-2")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ApprovalIcon className="size-4" aria-hidden />
                {approval.level === "analyst" ? "Analyst can send" : `${ROLE_LABEL[approval.level]} approval required`}
              </CardTitle>
              <CardDescription>Routed by the approval rules in Settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-1 text-sm">
                {approval.reasons.map((r) => (
                  <li key={r} className="flex items-start gap-1.5">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-current" aria-hidden /> {r}
                  </li>
                ))}
              </ul>
              {ws.status === "submitted" || ws.status === "approved" ? (
                ws.isStale ? (
                  <p className="rounded-md bg-warning-soft p-2.5 text-xs text-warning">
                    The price changed after submission. Resubmit so the approver sees the current quote.
                  </p>
                ) : (
                  <p className="rounded-md bg-muted p-2.5 text-xs text-muted-foreground">
                    {ws.status === "approved" ? "Approved. Changing the price will require re-approval." : "Waiting for approval."}
                  </p>
                )
              ) : null}
              <Button
                className="w-full"
                onClick={submit}
                disabled={ws.status === "sent" || ((ws.status === "submitted" || ws.status === "approved") && !ws.isStale)}
              >
                {ws.isStale ? "Resubmit" : approval.level === "analyst" ? "Mark ready to send" : `Submit to ${approval.level}`}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function BreakdownTable({ quote, packageId }: { quote: PackageQuote; packageId: PackageId }) {
  const { config } = usePricingConfig();
  const pkg = config.packages.find((p) => p.id === packageId)!;
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Service</TableHead>
            <TableHead>Driver × time standard</TableHead>
            <TableHead className="text-right">×</TableHead>
            <TableHead className="text-right">Hours</TableHead>
            <TableHead className="text-right">Role</TableHead>
            <TableHead className="text-right">Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quote.services.map((s) => (
            <TableRow key={s.service.id}>
              <TableCell className="font-medium">
                {s.service.name}
                {s.service.billing === "annual" ? <span className="text-xs font-normal text-muted-foreground"> (annual ÷ 12)</span> : null}
              </TableCell>
              <TableCell className="num text-xs whitespace-normal text-muted-foreground">
                {s.lines
                  .filter((l) => l.hours > 0)
                  .map((l) => (l.standard.driver ? `${+l.driverValue.toFixed(2)} × ${l.standard.value} ${l.standard.unit}` : `${l.standard.value} ${l.standard.unit} fixed`))
                  .join(" + ")}
              </TableCell>
              <TableCell className="num text-right text-muted-foreground">{s.multiplier !== 1 ? s.multiplier.toFixed(3) : "—"}</TableCell>
              <TableCell className="num text-right">{hrs(s.hours)}</TableCell>
              <TableCell className="text-right">
                <span title={config.roles[s.service.role].label} className="num text-xs">{s.service.role}</span>
              </TableCell>
              <TableCell className="num text-right">{usd(s.hours * priceRate(config, s.service.role))}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell className="font-medium">Review</TableCell>
            <TableCell className="num text-xs text-muted-foreground">{pct(config.reviewPct)} of {hrs(quote.preparerHours)} preparer time</TableCell>
            <TableCell />
            <TableCell className="num text-right">{hrs(quote.reviewHours)}</TableCell>
            <TableCell className="num text-right text-xs">L3</TableCell>
            <TableCell className="num text-right">{usd(quote.reviewHours * priceRate(config, "L3"))}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Client management</TableCell>
            <TableCell className="num text-xs text-muted-foreground">
              {config.clientManagementHours} h fixed{pkg.extraManagerHours ? ` + ${pkg.extraManagerHours} h dedicated manager` : ""}
            </TableCell>
            <TableCell />
            <TableCell className="num text-right">{hrs(quote.managementHours)}</TableCell>
            <TableCell className="num text-right text-xs">L3</TableCell>
            <TableCell className="num text-right">{usd(quote.managementHours * priceRate(config, "L3"))}</TableCell>
          </TableRow>
          {quote.slaPremium > 0 ? (
            <TableRow>
              <TableCell className="font-medium">SLA premium</TableCell>
              <TableCell className="num text-xs text-muted-foreground">+{pct(pkg.slaPremium)} for close by day {pkg.closeDay}</TableCell>
              <TableCell colSpan={3} />
              <TableCell className="num text-right">{usd(quote.slaPremium)}</TableCell>
            </TableRow>
          ) : null}
          {quote.contingency > 0 ? (
            <TableRow>
              <TableCell className="font-medium">Contingency</TableCell>
              <TableCell className="num text-xs text-muted-foreground">+{pct(config.contingencyPct)} for medium confidence</TableCell>
              <TableCell colSpan={3} />
              <TableCell className="num text-right">{usd(quote.contingency)}</TableCell>
            </TableRow>
          ) : null}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3}>
              Total · cost {usd(quote.monthlyCost)} · margin {pct(quote.margin, 1)}
            </TableCell>
            <TableCell className="num text-right">{hrs(quote.totalHours)}</TableCell>
            <TableCell className="text-right text-xs">↑ ${config.roundMonthlyTo}</TableCell>
            <TableCell className="num text-right font-semibold">{usd(quote.monthlyFee)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

function cleanupSummary(c: CleanupDrivers) {
  const parts = [
    c.unreconciledAccountMonths ? `${c.unreconciledAccountMonths} account-months unreconciled` : null,
    c.uncategorizedTxns ? `${c.uncategorizedTxns} suspense items` : null,
    c.backlogMonths ? `${c.backlogMonths} month${c.backlogMonths > 1 ? "s" : ""} of catch-up` : null,
  ].filter(Boolean);
  return parts.length ? `${parts.join(", ")}.` : "Reconciliations are current and suspense accounts are clear.";
}
