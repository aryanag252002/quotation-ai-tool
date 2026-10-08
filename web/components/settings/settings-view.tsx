"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CalendarDays, Check, Plug, RotateCcw, Video } from "lucide-react";
import { toast } from "sonner";
import { Pill } from "@/components/app/status";
import { NumField } from "@/components/settings/num-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_PRICING_CONFIG } from "@/lib/config/defaults";
import { usePricingConfig } from "@/lib/config/pricing-config-context";
import type { DealWorkspaceData } from "@/lib/data";
import { priceRate, quotePackage } from "@/lib/engine/pricing";
import { usd } from "@/lib/format";
import type { Industry, Role } from "@/lib/types";

const TABS = ["standards", "rates", "multipliers", "packages", "approvals", "integrations"] as const;
type Tab = (typeof TABS)[number];

export function SettingsView({ preview }: { preview: DealWorkspaceData | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tabParam = params.get("tab") as Tab | null;
  const tab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : "standards";
  const { config, update, reset, isCustomised } = usePricingConfig();

  const previewFees = (() => {
    if (!preview) return null;
    const inScope = new Set(preview.scope.filter((s) => s.included).map((s) => s.serviceId));
    return {
      before: quotePackage(DEFAULT_PRICING_CONFIG, "growth", preview.workloadDrivers, inScope).monthlyFee,
      after: quotePackage(config, "growth", preview.workloadDrivers, inScope).monthlyFee,
    };
  })();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Pricing & catalog</h1>
          <p className="text-sm text-muted-foreground">
            The rules the pricing engine uses. Changes apply instantly to every draft quote. In production, each change
            is versioned and can be simulated against past quotes before publishing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {previewFees ? (
            <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm">
              <span className="text-muted-foreground">Brightside · Growth</span>
              <span className="num">{usd(previewFees.before)}</span>
              <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
              <span className={`num font-semibold ${previewFees.after !== previewFees.before ? "text-primary" : ""}`}>{usd(previewFees.after)}</span>
            </div>
          ) : null}
          <Pill tone={isCustomised ? "warning" : "neutral"}>{isCustomised ? "Customised" : `Defaults · ${config.version}`}</Pill>
          <Button
            variant="outline"
            size="sm"
            disabled={!isCustomised}
            onClick={() => {
              reset();
              toast.success("Restored default pricing rules");
            }}
          >
            <RotateCcw /> Reset to defaults
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => router.replace(`${pathname}?tab=${v}`, { scroll: false })}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="standards">Time standards</TabsTrigger>
          <TabsTrigger value="rates">Rates & margin</TabsTrigger>
          <TabsTrigger value="multipliers">Multipliers</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="approvals">Approval rules</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="standards" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Service catalog & time standards</CardTitle>
              <CardDescription>How long each unit of work takes. These are the numbers to calibrate against past quotes.</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Service</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Time standards</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {config.services.map((svc, si) => (
                      <TableRow key={svc.id}>
                        <TableCell className="max-w-xs pl-4 align-top whitespace-normal">
                          <div className="font-medium">{svc.name}</div>
                          <div className="text-xs text-muted-foreground">{svc.description}</div>
                          {svc.billing === "annual" ? <Pill className="mt-1">Annual</Pill> : null}
                        </TableCell>
                        <TableCell className="align-top">
                          <span className="num text-sm" title={config.roles[svc.role].label}>{svc.role}</span>
                          <div className="text-xs text-muted-foreground">{config.roles[svc.role].label}</div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-wrap gap-x-6 gap-y-2">
                            {svc.standards.map((std, ti) => (
                              <NumField
                                key={std.id}
                                label={std.label}
                                value={std.value}
                                step={std.unit === "min" ? 0.5 : 0.25}
                                suffix={std.unit === "min" ? "min" : "h"}
                                onChange={(v) => update((d) => void (d.services[si].standards[ti].value = v))}
                              />
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates" className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Rate card</CardTitle>
              <CardDescription>Price rate = cost rate ÷ (1 − target margin).</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Role</TableHead>
                    <TableHead>Cost / hour</TableHead>
                    <TableHead className="pr-4 text-right">Price / hour</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(Object.keys(config.roles) as Role[]).map((r) => (
                    <TableRow key={r}>
                      <TableCell className="pl-4">
                        <span className="num mr-2 text-muted-foreground">{r}</span>
                        {config.roles[r].label}
                      </TableCell>
                      <TableCell>
                        <NumField label={`${config.roles[r].label} cost per hour`} hideLabel prefix="$" step={0.5} value={config.roles[r].cost} onChange={(v) => update((d) => void (d.roles[r].cost = v))} />
                      </TableCell>
                      <TableCell className="num pr-4 text-right font-medium">{usd(priceRate(config, r))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Margin, overhead & rounding</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <NumField label="Target margin" suffix="%" value={Math.round(config.targetMargin * 100)} onChange={(v) => update((d) => void (d.targetMargin = Math.min(v, 90) / 100))} />
              <NumField label="Review time (L3)" suffix="% of preparer hours" value={Math.round(config.reviewPct * 100)} onChange={(v) => update((d) => void (d.reviewPct = v / 100))} />
              <NumField label="Client management (L3)" suffix="h / month" step={0.5} value={config.clientManagementHours} onChange={(v) => update((d) => void (d.clientManagementHours = v))} />
              <NumField label="Minimum monthly fee" prefix="$" step={50} value={config.minMonthlyFee} onChange={(v) => update((d) => void (d.minMonthlyFee = v))} />
              <NumField label="Round monthly fee up to" prefix="$" step={10} min={1} value={config.roundMonthlyTo} onChange={(v) => update((d) => void (d.roundMonthlyTo = v))} />
              <NumField label="Low-confidence contingency" suffix="%" value={Math.round(config.contingencyPct * 100)} onChange={(v) => update((d) => void (d.contingencyPct = v / 100))} />
              <NumField label="Cleanup premium" suffix="%" value={Math.round(config.cleanup.premium * 100)} onChange={(v) => update((d) => void (d.cleanup.premium = v / 100))} />
              <NumField label="Cleanup share at L1" suffix="%" value={Math.round(config.cleanup.mixL1 * 100)} onChange={(v) => update((d) => void (d.cleanup.mixL1 = Math.min(v, 100) / 100))} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="multipliers" className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Complexity multipliers</CardTitle>
              <CardDescription>Multiplied together and applied to L1 transactional services.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <NumField label="Accrual basis" prefix="×" step={0.01} value={config.multipliers.accrual} onChange={(v) => update((d) => void (d.multipliers.accrual = v))} />
              <NumField label="Multi-currency" prefix="×" step={0.01} value={config.multipliers.multiCurrency} onChange={(v) => update((d) => void (d.multipliers.multiCurrency = v))} />
              <NumField label="Multi-currency threshold" suffix="% foreign txns" value={config.multipliers.multiCurrencyThresholdPct} onChange={(v) => update((d) => void (d.multipliers.multiCurrencyThresholdPct = v))} />
              <NumField label="Per tracking dimension" prefix="×" step={0.01} value={config.multipliers.perDimension} onChange={(v) => update((d) => void (d.multipliers.perDimension = v))} />
              <NumField label="Dimension cap" prefix="×" step={0.01} value={config.multipliers.dimensionCap} onChange={(v) => update((d) => void (d.multipliers.dimensionCap = v))} />
              <NumField label="Overall cap" prefix="×" step={0.05} value={config.multiplierCap} onChange={(v) => update((d) => void (d.multiplierCap = v))} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Industry factors</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {(Object.keys(config.multipliers.industry) as Industry[]).map((ind) => (
                <NumField
                  key={ind}
                  label={ind.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}
                  prefix="×"
                  step={0.01}
                  value={config.multipliers.industry[ind]}
                  onChange={(v) => update((d) => void (d.multipliers.industry[ind] = v))}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packages" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Package definitions</CardTitle>
              <CardDescription>Services the data proves are needed are added to every package automatically.</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Service</TableHead>
                      {config.packages.map((p) => (
                        <TableHead key={p.id} className="text-center">{p.name}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {config.services.map((svc) => (
                      <TableRow key={svc.id}>
                        <TableCell className="pl-4">{svc.name}</TableCell>
                        {config.packages.map((p, pi) => (
                          <TableCell key={p.id} className="text-center">
                            <Checkbox
                              aria-label={`${svc.name} in ${p.name}`}
                              checked={p.services.includes(svc.id)}
                              onCheckedChange={(v) =>
                                update((d) => {
                                  const list = d.packages[pi].services;
                                  d.packages[pi].services = v ? [...list, svc.id] : list.filter((x) => x !== svc.id);
                                })
                              }
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="pl-4 font-medium">Close by business day</TableCell>
                      {config.packages.map((p, pi) => (
                        <TableCell key={p.id}>
                          <div className="flex justify-center">
                            <NumField label={`${p.name} close day`} hideLabel min={1} value={p.closeDay} onChange={(v) => update((d) => void (d.packages[pi].closeDay = v))} />
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-4 font-medium">SLA premium</TableCell>
                      {config.packages.map((p, pi) => (
                        <TableCell key={p.id}>
                          <div className="flex justify-center">
                            <NumField label={`${p.name} SLA premium`} hideLabel suffix="%" value={Math.round(p.slaPremium * 100)} onChange={(v) => update((d) => void (d.packages[pi].slaPremium = v / 100))} />
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Analyst can send when…</CardTitle>
              <CardDescription>All conditions must hold and data confidence must be high; otherwise a manager approves.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <NumField label="Monthly fee below" prefix="$" step={100} value={config.approval.analystMaxMonthlyFee} onChange={(v) => update((d) => void (d.approval.analystMaxMonthlyFee = v))} />
              <NumField label="Cleanup fee below" prefix="$" step={100} value={config.approval.analystMaxCleanupFee} onChange={(v) => update((d) => void (d.approval.analystMaxCleanupFee = v))} />
              <NumField label="Price override within" prefix="±" suffix="%" value={config.approval.analystMaxOverridePct} onChange={(v) => update((d) => void (d.approval.analystMaxOverridePct = v))} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Partner must approve when…</CardTitle>
              <CardDescription>Any one condition escalates to a partner.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <NumField label="Monthly fee at least" prefix="$" step={100} value={config.approval.partnerMinMonthlyFee} onChange={(v) => update((d) => void (d.approval.partnerMinMonthlyFee = v))} />
              <NumField label="Cleanup fee at least" prefix="$" step={100} value={config.approval.partnerMinCleanupFee} onChange={(v) => update((d) => void (d.approval.partnerMinCleanupFee = v))} />
              <NumField label="Discount greater than" suffix="%" value={config.approval.partnerMaxDiscountPct} onChange={(v) => update((d) => void (d.approval.partnerMaxDiscountPct = v))} />
              <NumField label="Margin below" suffix="%" value={config.approval.partnerMinMarginPct} onChange={(v) => update((d) => void (d.approval.partnerMinMarginPct = v))} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="mt-4 space-y-4">
          <IntegrationGroup
            title="Accounting systems"
            description="One connector interface, a canonical ledger model behind it. Adding a system means adding one adapter."
            icon={Plug}
            items={[
              { name: "QuickBooks Online", note: "Native Intuit app · reports + reconciliation status", status: "connected" },
              { name: "Xero", note: "Via unified accounting API", status: "available" },
              { name: "Zoho Books", note: "Via unified accounting API", status: "available" },
              { name: "Sage / NetSuite", note: "Via unified accounting API", status: "available" },
              { name: "File upload", note: "TB, GL, bank statements, Tally / QB Desktop exports", status: "connected" },
            ]}
          />
          <IntegrationGroup
            title="Meetings & transcripts"
            description="Transcripts arrive automatically from your existing meeting platform. No recording app of our own."
            icon={Video}
            items={[
              { name: "Zoom", note: "recording.transcript_completed webhook", status: "connected" },
              { name: "Microsoft Teams", note: "Graph transcript subscription (admin consent)", status: "available" },
              { name: "Google Meet", note: "Workspace Events API (admin consent)", status: "available" },
              { name: "Recall.ai", note: "Universal fallback meeting bot", status: "available" },
            ]}
          />
          <IntegrationGroup
            title="Calendar, CRM & e-sign"
            icon={CalendarDays}
            items={[
              { name: "Google Calendar", note: "Creates invites and links meetings to quotes", status: "connected" },
              { name: "HubSpot / Zoho CRM", note: "Deal sync", status: "planned" },
              { name: "DocuSign / PandaDoc", note: "Proposal e-signature", status: "planned" },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IntegrationGroup({
  title,
  description,
  icon: Icon,
  items,
}: {
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  items: { name: string; note: string; status: "connected" | "available" | "planned" }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4" aria-hidden /> {title}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((i) => (
          <div key={i.name} className="flex items-start justify-between gap-3 rounded-md border p-3">
            <div className="min-w-0">
              <div className="text-sm font-medium">{i.name}</div>
              <div className="text-xs text-muted-foreground">{i.note}</div>
            </div>
            {i.status === "connected" ? (
              <Pill tone="success" icon={Check}>Connected</Pill>
            ) : i.status === "planned" ? (
              <Pill>Roadmap</Pill>
            ) : (
              <Button size="sm" variant="outline" onClick={() => toast.info(`${i.name}`, { description: "Connection flows are not wired up in this demo." })}>
                Connect
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
