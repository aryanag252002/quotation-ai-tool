"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CheckCheck, ClipboardCopy, FileStack, Landmark, ListChecks, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Pill } from "@/components/app/status";
import { StatCard } from "@/components/app/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { tenant, users } from "@/lib/data/mock/pipeline";
import { monthsBehind, REQUEST_CATEGORIES } from "@/lib/engine/requests";
import { dateTime, monthName, SYSTEM_LABEL, usd } from "@/lib/format";
import { useDealWorkspace } from "@/lib/state/deal-workspace";
import { cn } from "@/lib/utils";
import type { DocumentRequest, LedgerAccount, RequestCategory } from "@/lib/types";

const KIND_LABEL: Record<LedgerAccount["kind"], string> = { bank: "Bank", card: "Credit card", clearing: "Processor clearing", loan: "Loan" };

export function RequestsView() {
  const { deal, data, docRequests, docRequestsSentAt, set } = useDealWorkspace();
  const [draft, setDraft] = useState("");
  const asOf = data.volumes.at(-1)!.month;
  const analyst = users.find((u) => u.id === deal.ownerId)?.name ?? users[0].name;

  const behindAccounts = data.accounts.filter((a) => monthsBehind(a, asOf) > 0);
  const statementMonths = docRequests.reduce((n, r) => n + (r.category === "statements" || r.category === "processors" ? (r.months ?? 0) : 0), 0);
  const cleanupCount = docRequests.filter((r) => r.priority === "cleanup").length;
  const received = docRequests.filter((r) => r.received).length;
  const outstanding = docRequests.filter((r) => !r.received);

  const update = (id: string, patch: Partial<DocumentRequest>) =>
    set("docRequests", docRequests.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => set("docRequests", docRequests.filter((r) => r.id !== id));
  const addItem = () => {
    const title = draft.trim();
    if (!title) return;
    set("docRequests", [
      ...docRequests,
      { id: `custom-${Date.now()}`, category: "other", title, detail: "Added by analyst", priority: "cleanup", received: false },
    ]);
    setDraft("");
  };

  const message = buildMessage({
    firstName: deal.prospect.contactName.split(" ")[0],
    system: SYSTEM_LABEL[data.snapshot.connection.system],
    items: outstanding,
    analyst,
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Request copied", { description: "Paste it into an email or your practice-management tool." });
    } catch {
      toast.error("Couldn’t copy", { description: "Select the text and copy it manually." });
    }
  };

  const send = () => {
    set("docRequestsSentAt", new Date().toISOString());
    toast.success("Document request sent", {
      description: `${outstanding.length} items emailed to ${deal.prospect.contactEmail} with a secure upload link.`,
    });
  };

  const categories = (Object.keys(REQUEST_CATEGORIES) as RequestCategory[]).filter((c) => docRequests.some((r) => r.category === c));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Accounts to reconcile"
          value={`${behindAccounts.length} of ${data.accounts.length}`}
          hint={behindAccounts.length ? "Behind the latest month-end" : "All reconciled and current"}
          icon={Landmark}
        />
        <StatCard label="Statement months" value={statementMonths} hint="Bank, card, loan and payout statements" icon={FileStack} />
        <StatCard label="Items requested" value={docRequests.length} hint={`${cleanupCount} needed before cleanup starts`} icon={ListChecks} />
        <StatCard
          label="Received"
          value={`${received} / ${docRequests.length}`}
          hint={<Progress value={docRequests.length ? (received / docRequests.length) * 100 : 0} className="mt-1 h-1.5" aria-label="Items received" />}
          icon={CheckCheck}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Accounts to reconcile</CardTitle>
              <CardDescription>
                Every account that must tie to an outside statement, with how far behind it is as of {monthName(asOf)}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead className="hidden sm:table-cell">Type</TableHead>
                      <TableHead className="text-right">Book balance</TableHead>
                      <TableHead>Last reconciled</TableHead>
                      <TableHead className="text-right">Months behind</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.accounts.map((a) => {
                      const behind = monthsBehind(a, asOf);
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.name}</TableCell>
                          <TableCell className="hidden text-muted-foreground sm:table-cell">{KIND_LABEL[a.kind]}</TableCell>
                          <TableCell className="num text-right">{usd(a.balance)}</TableCell>
                          <TableCell className="text-muted-foreground">{a.lastReconciled ? monthName(a.lastReconciled) : "Never"}</TableCell>
                          <TableCell className="text-right">
                            {behind === 0 ? (
                              <Pill tone="success">Current</Pill>
                            ) : (
                              <Pill tone={behind > 3 ? "danger" : "warning"}>{a.lastReconciled ? `${behind} mo` : "12 mo look-back"}</Pill>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What we need from the client</CardTitle>
              <CardDescription>
                Generated from the analysis. Each item links to the signal that triggered it. Edit the list, then tick items off
                as they arrive.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {categories.map((c) => (
                <section key={c} aria-labelledby={`req-${c}`} className="space-y-2">
                  <h3 id={`req-${c}`} className="text-sm font-semibold">
                    {REQUEST_CATEGORIES[c]}
                  </h3>
                  <ul className="divide-y rounded-md border">
                    {docRequests
                      .filter((r) => r.category === c)
                      .map((r) => (
                        <li key={r.id} className={cn("flex items-start gap-3 p-3", r.received && "bg-muted/40")}>
                          <Checkbox
                            id={`req-item-${r.id}`}
                            checked={r.received}
                            onCheckedChange={(v) => update(r.id, { received: v === true })}
                            className="mt-0.5"
                            aria-label={`Mark “${r.title}” as received`}
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <label htmlFor={`req-item-${r.id}`} className={cn("cursor-pointer text-sm font-medium", r.received && "text-muted-foreground line-through")}>
                                {r.title}
                              </label>
                              {r.period ? <span className="num text-xs text-muted-foreground">{r.period}</span> : null}
                            </div>
                            <p className="text-xs text-muted-foreground">{r.detail}</p>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {r.received ? (
                                <Pill tone="success">Received</Pill>
                              ) : (
                                <Pill tone={r.priority === "cleanup" ? "warning" : "neutral"}>
                                  {r.priority === "cleanup" ? "Needed for cleanup" : "Needed for monthly close"}
                                </Pill>
                              )}
                              {r.signalIds?.map((s) => (
                                <span key={s} className="num rounded border px-1.5 text-[11px] text-muted-foreground">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" aria-label={`Remove “${r.title}”`} onClick={() => remove(r.id)}>
                            <Trash2 />
                          </Button>
                        </li>
                      ))}
                  </ul>
                </section>
              ))}
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  addItem();
                }}
              >
                <Input aria-label="New request item" placeholder="Add an item, e.g. Lease agreement for the warehouse" value={draft} onChange={(e) => setDraft(e.target.value)} />
                <Button type="submit" variant="outline" disabled={!draft.trim()}>
                  <Plus /> Add
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 self-start xl:sticky xl:top-16">
          <Card>
            <CardHeader>
              <CardTitle>Send to client</CardTitle>
              <CardDescription>Emailed with a secure upload link to the prospect portal.</CardDescription>
              <CardAction>
                {docRequestsSentAt ? <Pill tone="info">Sent</Pill> : <Pill>Not sent</Pill>}
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-3">
              <pre className="max-h-96 overflow-auto rounded-md border bg-muted/40 p-3 font-sans text-xs leading-relaxed whitespace-pre-wrap">
                {message}
              </pre>
              {docRequestsSentAt ? (
                <p className="text-xs text-muted-foreground">
                  Sent {dateTime(docRequestsSentAt)} to {deal.prospect.contactEmail}.
                </p>
              ) : null}
              <div className="flex gap-2">
                <Button className="flex-1" onClick={send} disabled={outstanding.length === 0}>
                  <Send /> {docRequestsSentAt ? "Send reminder" : "Send request"}
                </Button>
                <Button variant="outline" onClick={copy} aria-label="Copy request text">
                  <ClipboardCopy /> Copy
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next</CardTitle>
              <CardDescription>
                The request can go out before the call. Anything still missing becomes a question in the pre-call brief.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/deals/${deal.id}/brief`}>
                  Continue to pre-call brief <ArrowRight />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function buildMessage({ firstName, system, items, analyst }: { firstName: string; system: string; items: DocumentRequest[]; analyst: string }) {
  if (!items.length) return `Hi ${firstName},\n\nThanks, we have everything we need to reconcile your books.\n\n${analyst}\n${tenant.name}`;
  const groups = (Object.keys(REQUEST_CATEGORIES) as RequestCategory[])
    .map((c) => {
      const lines = items.filter((r) => r.category === c).map((r) => `• ${r.title}${r.period ? ` (${r.period})` : ""}`);
      return lines.length ? `${REQUEST_CATEGORIES[c]}\n${lines.join("\n")}` : "";
    })
    .filter(Boolean);
  return [
    `Hi ${firstName},`,
    `Thanks for connecting ${system}. We’ve reviewed your books, and to reconcile them we need the items below. You can upload everything through your secure portal link; PDFs or exports are both fine.`,
    ...groups,
    "If anything is hard to find, reply and we’ll help you locate it.",
    `Kind regards,\n${analyst}\n${tenant.name}`,
  ].join("\n\n");
}
