"use client";

import { CheckCircle2, CircleHelp, KeyRound, Link2, ShieldCheck } from "lucide-react";
import { SectionTitle } from "@/components/app/page-header";
import { Pill } from "@/components/app/status";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dateTime, int, SYSTEM_LABEL } from "@/lib/format";
import { externalIdLabel } from "@/lib/data/generate";
import { useDealWorkspace } from "@/lib/state/deal-workspace";

const ACCESS_LABEL = {
  accountant_user: "Accountant user (invited by prospect)",
  prospect_oauth: "Prospect admin via portal",
  file_upload: "File upload",
} as const;

const RESOLUTION = {
  pre_call_question: { label: "Asked on call", tone: "ai" as const },
  file_request: { label: "File requested", tone: "info" as const },
  assumption: { label: "Assumption", tone: "neutral" as const },
};

export function DataAccessView() {
  const { data } = useDealWorkspace();
  const { snapshot, questionnaire, activity } = data;
  const c = snapshot.connection;
  const totalCalls = snapshot.entities.reduce((a, e) => a + e.apiCalls, 0);
  const totalRecords = snapshot.entities.reduce((a, e) => a + e.records, 0);

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="size-4" aria-hidden /> Connection
            </CardTitle>
            <CardDescription>One snapshot pull, no continuous sync. Access is revoked automatically if the deal is lost.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["System", SYSTEM_LABEL[c.system]],
                ["Access path", ACCESS_LABEL[c.accessPath]],
                ["Company", c.companyName],
                [externalIdLabel(c.system), <span key="r" className="num">{c.externalId}</span>],
                ["Connected by", `${c.connectedBy} · ${dateTime(c.connectedAt)}`],
                ["History window", `${c.windowMonths} months`],
              ].map(([k, v]) => (
                <div key={String(k)} className="space-y-0.5">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
          <CardFooter className="flex-wrap gap-2 border-t bg-muted/40 py-3">
            {c.system === "upload" ? (
              <span className="text-xs text-muted-foreground">
                Exports uploaded by the prospect. Nothing connects to their accounting software.
              </span>
            ) : (
              <>
                <Pill tone="success" icon={ShieldCheck}>Read-only enforced by QuoteIQ</Pill>
                <span className="text-xs text-muted-foreground">
                  {SYSTEM_LABEL[c.system]} grants read/write; our client issues read calls only and logs every call.
                </span>
              </>
            )}
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <SectionTitle hint={`Pulled ${dateTime(snapshot.syncedAt)} · ${snapshot.durationMinutes} min`}>Snapshot</SectionTitle>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Entity / report</TableHead>
                    <TableHead className="text-right">Records</TableHead>
                    <TableHead className="text-right">API calls</TableHead>
                    <TableHead className="pr-4 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshot.entities.map((e) => (
                    <TableRow key={e.entity}>
                      <TableCell className="pl-4">{e.entity}</TableCell>
                      <TableCell className="num text-right">{int(e.records)}</TableCell>
                      <TableCell className="num text-right">{e.apiCalls}</TableCell>
                      <TableCell className="pr-4 text-right">
                        <span className="inline-flex items-center gap-1 text-success">
                          <CheckCircle2 className="size-4" aria-hidden /> Done
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="pl-4">Total</TableCell>
                    <TableCell className="num text-right">{int(totalRecords)}</TableCell>
                    <TableCell className="num text-right">{totalCalls}</TableCell>
                    <TableCell className="pr-4" />
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Integrity checks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-md bg-success-soft p-3">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              <div className="text-sm">
                <div className="font-medium">Trial balance ties out</div>
                <div className="text-muted-foreground">
                  <span className="num">{snapshot.tieOut.monthsTied}</span> of{" "}
                  <span className="num">{snapshot.tieOut.monthsChecked}</span> month-ends match the pulled transactions
                  (max variance <span className="num">${snapshot.tieOut.maxVariance.toFixed(2)}</span>).
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <CircleHelp className="size-4 text-muted-foreground" aria-hidden /> Capability gaps
              </div>
              <ul className="space-y-2.5">
                {snapshot.gaps.map((g) => (
                  <li key={g.id} className="space-y-1 rounded-md border p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium">{g.label}</span>
                      <Pill tone={RESOLUTION[g.resolution].tone}>{RESOLUTION[g.resolution].label}</Pill>
                    </div>
                    <p className="text-xs text-muted-foreground">{g.impact}</p>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-4" aria-hidden /> Prospect questionnaire
            </CardTitle>
            <CardDescription>Answered in the prospect portal</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2.5 text-sm">
              {questionnaire.map((q) => (
                <div key={q.q}>
                  <dt className="text-xs text-muted-foreground">{q.q}</dt>
                  <dd>{q.a}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-3 border-l pl-4">
              {activity.map((a) => (
                <li key={a.at + a.label} className="relative">
                  <span
                    className={`absolute top-1.5 -left-[21px] size-2.5 rounded-full ring-2 ring-card ${a.actor === "QuoteIQ" ? "bg-ai" : "bg-primary"}`}
                    aria-hidden
                  />
                  <div className="text-sm">{a.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.actor} · {dateTime(a.at)}
                    {a.minutes ? <> · <span className="num">{a.minutes} min</span> human time</> : null}
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
