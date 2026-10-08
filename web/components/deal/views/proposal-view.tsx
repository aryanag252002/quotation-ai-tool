"use client";

import { useState } from "react";
import { Check, CheckCircle2, Clock, FileDown, Send, ShieldCheck, Undo2, UserRoundCog, X } from "lucide-react";
import { toast } from "sonner";
import { AiBadge, Pill } from "@/components/app/status";
import { buildAssumptions } from "@/components/deal/assumptions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { usePricingConfig } from "@/lib/config/pricing-config-context";
import { date, dateTime, hrs, ROLE_LABEL, usd } from "@/lib/format";
import { useDealWorkspace, type QuoteStatus } from "@/lib/state/deal-workspace";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

const RANK: Record<UserRole, number> = { analyst: 0, manager: 1, partner: 2 };
const VIEWER: Record<UserRole, string> = { analyst: "Priya Sharma", manager: "Rahul Mehta", partner: "Anita Desai" };

const STATUS_META: Record<QuoteStatus, { label: string; tone: "neutral" | "warning" | "success" | "danger" | "info" }> = {
  draft: { label: "Draft", tone: "neutral" },
  submitted: { label: "Pending approval", tone: "warning" },
  approved: { label: "Approved · ready to send", tone: "success" },
  changes_requested: { label: "Changes requested", tone: "danger" },
  sent: { label: "Sent to prospect", tone: "info" },
};

export function ProposalView() {
  const { role, setRole } = usePricingConfig();
  const ws = useDealWorkspace();
  const { deal, approval, status, events, set, addEvent } = ws;
  const [comment, setComment] = useState("");
  const canApprove = status === "submitted" && !ws.isStale && RANK[role] >= RANK[approval.level];
  const meta = ws.isStale ? { label: "Changed since submission", tone: "danger" as const } : STATUS_META[status];

  const decide = (action: "approved" | "changes_requested") => {
    set("status", action);
    addEvent({ by: VIEWER[role], action, note: comment || undefined });
    setComment("");
    toast[action === "approved" ? "success" : "warning"](action === "approved" ? "Quote approved" : "Changes requested", {
      description: action === "approved" ? "The analyst can now send the proposal." : "The analyst has been notified.",
    });
  };

  const send = () => {
    set("status", "sent");
    addEvent({ by: VIEWER[role], action: "sent", note: `E-sign link emailed to ${deal.prospect.contactEmail}` });
    toast.success("Proposal sent", { description: `E-sign link emailed to ${deal.prospect.contactEmail}.` });
  };

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="space-y-4 self-start xl:sticky xl:top-16 print:hidden">
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-between gap-2">
              Approval
              <Pill tone={meta.tone}>{meta.label}</Pill>
            </CardTitle>
            <CardDescription>
              Required level: <span className="font-medium text-foreground">{ROLE_LABEL[approval.level]}</span>. Nothing is
              sent to a prospect without a named human.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-1 text-sm">
              {approval.reasons.map((r) => (
                <li key={r} className="flex items-start gap-1.5">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden /> {r}
                </li>
              ))}
            </ul>

            {ws.isStale ? (
              <p className="rounded-md bg-warning-soft p-3 text-sm text-warning">
                The price changed after this quote was submitted. Resubmit it from the Pricing step.
              </p>
            ) : null}

            {status === "draft" ? (
              <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">Submit the quote from the Pricing step first.</p>
            ) : null}

            {status === "submitted" && !ws.isStale ? (
              canApprove ? (
                <div className="space-y-2">
                  <Textarea aria-label="Approval comment" placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => decide("approved")}>
                      <Check /> Approve
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => decide("changes_requested")}>
                      <X /> Request changes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 rounded-md border border-warning/40 bg-warning-soft/50 p-3 text-sm">
                  <p>
                    Waiting for a {ROLE_LABEL[approval.level].toLowerCase()}. You’re viewing as {VIEWER[role]} ({ROLE_LABEL[role]}).
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setRole(approval.level)}>
                    <UserRoundCog /> Switch to {VIEWER[approval.level]} (demo)
                  </Button>
                </div>
              )
            ) : null}

            {status === "changes_requested" ? (
              <Button variant="outline" className="w-full" onClick={() => set("status", "draft")}>
                <Undo2 /> Back to draft
              </Button>
            ) : null}

            <div className="flex gap-2">
              <Button className="flex-1" disabled={status !== "approved" || ws.isStale} onClick={send}>
                <Send /> Send to prospect
              </Button>
              <Button variant="outline" onClick={() => window.print()} aria-label="Export PDF">
                <FileDown /> PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audit trail</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No approval activity yet.</p>
            ) : (
              <ol className="space-y-3">
                {events.map((e) => (
                  <li key={e.at + e.action} className="flex gap-2 text-sm">
                    {e.action === "approved" || e.action === "sent" ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                    ) : e.action === "changes_requested" ? (
                      <X className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
                    ) : (
                      <Clock className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                    )}
                    <div>
                      <div>
                        <span className="font-medium">{e.by}</span> {e.action.replace("_", " ")}
                      </div>
                      {e.note ? <div className="text-xs text-muted-foreground">{e.note}</div> : null}
                      <div className="text-xs text-muted-foreground">{dateTime(e.at)}</div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <ProposalDocument />
    </div>
  );
}

function ProposalDocument() {
  const { config } = usePricingConfig();
  const ws = useDealWorkspace();
  const { deal, data } = ws;
  const rec = config.packages.find((p) => p.id === ws.recommendedPackage)!;
  const findings = data.findings.filter((f) => ws.findingStatus[f.id] !== "rejected");
  const allServices = config.services.filter((s) =>
    config.packages.some((p) => ws.quotes[p.id].services.some((x) => x.service.id === s.id)),
  );
  const issued = "2026-10-08T00:00:00Z";
  return (
    <Card className="xl:col-span-2 print:col-span-3 print:shadow-none print:ring-0">
      <CardContent className="space-y-8 p-6 sm:p-10">
        <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Proposal</div>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Accounting services for {deal.prospect.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Prepared by Northstar Accounting Services for {deal.prospect.contactName}, {deal.prospect.contactTitle}
            </p>
          </div>
          <div className="text-sm sm:text-right">
            <div>Issued {date(issued)}</div>
            <div className="text-muted-foreground">Valid for 30 days</div>
            <div className="mt-2 print:hidden">
              <AiBadge label="Narrative AI-drafted · numbers from engine" />
            </div>
          </div>
        </header>

        <Section n={1} title="Our understanding of your business">
          <p className="text-sm leading-relaxed">{data.briefSummary}</p>
          <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
            {data.requirements.slice(0, 6).map((r) => (
              <li key={r.id}>
                <span className="text-muted-foreground">{r.field}:</span> {r.value}
              </li>
            ))}
          </ul>
        </Section>

        <Section n={2} title="What we found in your books">
          <ul className="space-y-2 text-sm">
            {findings.map((f) => (
              <li key={f.id}>
                <span className="font-medium">{f.title}.</span> <span className="text-muted-foreground">{f.detail}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section n={3} title="Packages">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  {config.packages.map((p) => (
                    <TableHead key={p.id} className={cn("text-center", p.id === rec.id && "bg-accent text-accent-foreground")}>
                      {p.name}
                      {p.id === rec.id ? " ★" : ""}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {allServices.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.name}</TableCell>
                    {config.packages.map((p) => {
                      const inc = ws.quotes[p.id].services.some((x) => x.service.id === s.id);
                      return (
                        <TableCell key={p.id} className={cn("text-center", p.id === rec.id && "bg-accent/50")}>
                          {inc ? <Check className="mx-auto size-4 text-success" aria-label="Included" /> : <span className="text-muted-foreground" aria-label="Not included">—</span>}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell>Close completed by</TableCell>
                  {config.packages.map((p) => (
                    <TableCell key={p.id} className={cn("num text-center", p.id === rec.id && "bg-accent/50")}>
                      Day {p.closeDay}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="font-semibold">
                  <TableCell>Monthly fee</TableCell>
                  {config.packages.map((p) => (
                    <TableCell key={p.id} className={cn("num text-center", p.id === rec.id && "bg-accent/50")}>
                      {usd(p.id === rec.id ? ws.finalFee : ws.quotes[p.id].monthlyFee)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <p className="mt-2 text-sm">
            We recommend <span className="font-medium">{rec.name}</span>: it covers accounts payable, invoicing,
            sales tax and a proper month-end close by day {rec.closeDay}, as discussed on our call.
          </p>
        </Section>

        <Section n={4} title="One-time cleanup project">
          <p className="text-sm">
            Bring the books current before monthly service starts: reconcile {data.cleanupDrivers.unreconciledAccountMonths}{" "}
            account-months, recategorise suspense items, clear undeposited funds and catch up September. Estimated{" "}
            <span className="num">{hrs(ws.cleanup.hours)}</span>, completed before your December investor update.
          </p>
          <p className="num mt-2 text-lg font-semibold">{usd(ws.cleanup.fee)}</p>
          <p className="text-xs text-muted-foreground">50% on signature, 50% on completion.</p>
        </Section>

        <Section n={5} title="Onboarding timeline">
          <ol className="grid gap-2 text-sm sm:grid-cols-4">
            {["Week 1: access, kickoff, document request", "Weeks 1–3: cleanup and catch-up", "Week 3: first reconciliations and AP handover", "Week 4: first monthly close"].map((s) => (
              <li key={s} className="rounded-md border p-2.5">{s}</li>
            ))}
          </ol>
        </Section>

        <Section n={6} title="Assumptions">
          <ul className="list-disc space-y-1 pl-4 text-sm">
            {buildAssumptions(ws.drivers, ws.scopeIncluded).map((a) => (
              <li key={a}>{a}</li>
            ))}
            {ws.protection === "true_up" ? <li>Fees are reviewed after 90 days of actual volumes.</li> : null}
          </ul>
        </Section>

        <Section n={7} title="What we need from you">
          <ul className="list-disc space-y-1 pl-4 text-sm">
            {data.openItems.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </Section>

        <Section n={8} title="Terms">
          <p className="text-sm text-muted-foreground">
            Monthly fees billed in advance, net 15. 12-month term with 30 days’ notice. Prices reviewed annually.
            All amounts in {config.currency}.
          </p>
        </Section>

        <footer className="grid gap-6 border-t pt-6 text-sm sm:grid-cols-2">
          <div>
            <div className="h-10 border-b" />
            <div className="mt-1 text-muted-foreground">{deal.prospect.contactName}, {deal.prospect.name}</div>
          </div>
          <div>
            <div className="h-10 border-b" />
            <div className="mt-1 text-muted-foreground">Northstar Accounting Services</div>
          </div>
        </footer>
      </CardContent>
    </Card>
  );
}


function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 break-inside-avoid">
      <h3 className="text-base font-semibold">
        <span className="num mr-2 text-muted-foreground">{n}.</span>
        {title}
      </h3>
      {children}
    </section>
  );
}
