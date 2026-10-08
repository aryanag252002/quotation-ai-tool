"use client";

import { useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { updateCustomDeal, useCustomDeal } from "@/lib/state/custom-deals";
import type { LedgerSystem } from "@/lib/types";
import { Check, CheckCircle2, Clock, FileUp, Loader2, Lock, ShieldCheck, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const SYSTEMS: { id: LedgerSystem; label: string }[] = [
  { id: "qbo", label: "QuickBooks Online" },
  { id: "xero", label: "Xero" },
  { id: "zoho", label: "Zoho Books" },
  { id: "sage", label: "Sage" },
  { id: "netsuite", label: "NetSuite" },
];

const QUESTIONS = [
  ["services", "What services are you looking for?", "e.g. bookkeeping, bill pay, payroll"],
  ["why", "What’s prompting the change?", ""],
  ["tools", "Other tools you use", "e.g. Shopify, Stripe, Gusto"],
  ["employees", "Number of employees", ""],
  ["start", "Ideal start date", ""],
  ["budget", "Monthly budget range", ""],
] as const;
const STEPS = ["Connect your books", "A few questions", "Review & submit"];

export function PortalView({ token, prospect, kpo }: { token: string; prospect: string | null; kpo: string }) {
  const hydrated = useHydrated();
  const custom = useCustomDeal(token);
  const name = custom?.prospect.name ?? prospect ?? "your company";
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [connecting, setConnecting] = useState<LedgerSystem | null>(null);
  const [connected, setConnected] = useState<LedgerSystem | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [done, setDone] = useState(false);

  const connect = (system: LedgerSystem) => {
    setConnecting(system);
    window.setTimeout(() => {
      setConnecting(null);
      setConnected(system);
    }, 1200);
  };

  const ready = !!connected || files.length > 0;
  const connectedLabel = SYSTEMS.find((s) => s.id === connected)?.label ?? null;

  const submit = () => {
    if (custom) {
      updateCustomDeal(custom.id, (d) => ({
        ...d,
        system: connected ?? "upload",
        accessPath: connected ? "prospect_oauth" : "file_upload",
        portalAnswers: QUESTIONS.filter(([id]) => answers[id]?.trim()).map(([id, label]) => ({ q: label, a: answers[id].trim() })),
        progress: { ...d.progress, connectedAt: new Date().toISOString(), connectedBy: d.prospect.contactName },
      }));
    }
    setDone(true);
  };

  if (hydrated && !prospect && !custom) {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <CardContent className="space-y-3 py-10">
          <h2 className="text-lg font-semibold">This link has expired</h2>
          <p className="text-sm text-muted-foreground">Ask {kpo} for a new secure link.</p>
        </CardContent>
      </Card>
    );
  }

  if (done || custom?.progress.connectedAt) {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <CardContent className="space-y-3 py-10">
          <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
          <h2 className="text-lg font-semibold">Thank you, you’re all set</h2>
          <p className="text-sm text-muted-foreground">
            {kpo} will review your books and send a short agenda before your consultation. You can revoke access at any time
            from {connectedLabel ?? "your accounting software"}.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">Get your quote from {kpo}</h1>
        <p className="text-sm text-muted-foreground">
          For {name}. Takes about 5 minutes, and your quote arrives the day after your consultation.
        </p>
      </div>

      <ol className="flex items-center justify-center gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2 text-sm">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-xs font-semibold ring-1 ring-inset",
                i < step ? "bg-success-soft text-success ring-success/30" : i === step ? "bg-primary text-primary-foreground ring-primary" : "text-muted-foreground ring-border",
              )}
              aria-current={i === step ? "step" : undefined}
            >
              {i < step ? <Check className="size-3.5" aria-label="complete" /> : i + 1}
            </span>
            <span className={cn("hidden sm:inline", i === step ? "font-medium" : "text-muted-foreground")}>{s}</span>
            {i < STEPS.length - 1 ? <span className="mx-1 h-px w-6 bg-border" aria-hidden /> : null}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Connect your accounting software</CardTitle>
            <CardDescription>We look at the last 24 months to understand your workload. We never change anything.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SYSTEMS.map(({ id: s, label }) => {
                const isConnected = connected === s;
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={!!connecting || (!!connected && !isConnected)}
                    onClick={() => connect(s)}
                    className={cn(
                      "flex h-14 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors duration-150",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
                      isConnected ? "border-success bg-success-soft text-success" : "hover:border-primary hover:bg-accent",
                    )}
                  >
                    {connecting === s ? <Loader2 className="size-4 animate-spin" aria-hidden /> : isConnected ? <CheckCircle2 className="size-4" aria-hidden /> : null}
                    {connecting === s ? "Connecting…" : isConnected ? `${label} connected` : label}
                  </button>
                );
              })}
            </div>
            {connected ? (
              <Button variant="ghost" size="sm" onClick={() => setConnected(null)}>
                <Undo2 /> Disconnect
              </Button>
            ) : null}

            <ul className="grid gap-2 text-sm sm:grid-cols-2">
              {[
                { icon: ShieldCheck, t: "Read-only use: we never create or change records" },
                { icon: Clock, t: "Only the last 24 months are used" },
                { icon: Undo2, t: "Revoke access any time from your software" },
                { icon: Lock, t: "Encrypted; deleted after 90 days if we don’t work together" },
              ].map(({ icon: Icon, t }) => (
                <li key={t} className="flex items-start gap-2 text-muted-foreground">
                  <Icon className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> {t}
                </li>
              ))}
            </ul>

            <div className="space-y-2 rounded-lg border border-dashed p-4">
              <Label htmlFor="files" className="flex items-center gap-2">
                <FileUp className="size-4" aria-hidden /> Prefer not to connect? Upload exports instead
              </Label>
              <p className="text-xs text-muted-foreground">Trial balance, general ledger, and bank statements (CSV, XLSX or PDF).</p>
              <Input
                id="files"
                type="file"
                multiple
                accept=".csv,.xlsx,.xls,.pdf"
                onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? []).map((f) => f.name)])}
              />
              {files.length ? (
                <ul className="space-y-1">
                  {files.map((f) => (
                    <li key={f} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{f}</span>
                      <Button variant="ghost" size="icon" aria-label={`Remove ${f}`} onClick={() => setFiles(files.filter((x) => x !== f))}>
                        <Trash2 />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </CardContent>
          <CardFooter className="justify-end border-t pt-4">
            <Button disabled={!ready} onClick={() => setStep(1)}>
              Continue
            </Button>
          </CardFooter>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>A few quick questions</CardTitle>
            <CardDescription>Helps us prepare a focused consultation. All optional.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {QUESTIONS.map(([id, label, ph]) => {
              const field = {
                id: `q-${id}`,
                placeholder: ph,
                value: answers[id] ?? "",
                onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setAnswers((a) => ({ ...a, [id]: e.target.value })),
              };
              return (
                <div key={id} className={cn("space-y-1.5", id === "why" && "sm:col-span-2")}>
                  <Label htmlFor={`q-${id}`}>{label}</Label>
                  {id === "why" ? <Textarea {...field} /> : <Input {...field} />}
                </div>
              );
            })}
          </CardContent>
          <CardFooter className="justify-between border-t pt-4">
            <Button variant="ghost" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button onClick={() => setStep(2)}>Continue</Button>
          </CardFooter>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Review & submit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <dl className="space-y-2">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Books</dt>
                <dd className="font-medium">{connectedLabel ?? `${files.length} file(s) uploaded`}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">History used</dt>
                <dd className="font-medium">Last 24 months</dd>
              </div>
            </dl>
            <Label className="flex cursor-pointer items-start gap-2 font-normal">
              <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
              <span>
                I authorise {kpo} to read my accounting data to prepare a quotation. Access is read-only in use and will be
                revoked if we don’t proceed.
              </span>
            </Label>
          </CardContent>
          <CardFooter className="justify-between border-t pt-4">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button disabled={!consent} onClick={submit}>
              Submit
            </Button>
          </CardFooter>
        </Card>
      ) : null}
    </div>
  );
}
