"use client";

/**
 * Gates workspace steps for prospects added during a demo. Real-world events (prospect connects
 * books, call ends and the transcript webhook fires) are simulated here with one click each, so
 * the whole flow can be shown live. Seeded deals pass straight through.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  PlugZap,
  Sparkles,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { Pill } from "@/components/app/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { tenant } from "@/lib/data/mock/pipeline";
import { dateTime, PLATFORM_LABEL, SYSTEM_LABEL } from "@/lib/format";
import { updateProgress } from "@/lib/state/custom-deals";
import { useDealWorkspace } from "@/lib/state/deal-workspace";
import { cn } from "@/lib/utils";

type Step = "data" | "analysis" | "brief" | "meeting" | "scope" | "pricing" | "proposal";

export function StepGate({ step, children }: { step: Step; children: React.ReactNode }) {
  const { milestones: m } = useDealWorkspace();
  if (!m.simulated) return children;
  if (!m.connected) return <AwaitingData />;
  if (!m.analysed) return <Analysing />;
  if (step === "data" || step === "analysis" || step === "brief") return children;
  if (!m.callHeld) return step === "meeting" ? <CallPending /> : <NeedsCall step={step} />;
  return children;
}

function DemoNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-md border border-dashed bg-muted/40 p-2.5 text-xs text-muted-foreground">
      <Sparkles className="mt-0.5 size-3.5 shrink-0 text-ai" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

// ── 1. Waiting for the prospect's books ─────────────────────────────────────

function AwaitingData() {
  const { deal, custom } = useDealWorkspace();
  const [connecting, setConnecting] = useState(false);
  const accountant = custom?.accessPath === "accountant_user";
  const upload = custom?.accessPath === "file_upload" || deal.system === "upload";
  const portalPath = `/portal/${deal.id}`;
  const contactFirst = deal.prospect.contactName.split(" ")[0];
  const system = SYSTEM_LABEL[deal.system];

  const simulate = (by: string) => {
    setConnecting(true);
    window.setTimeout(() => {
      updateProgress(deal.id, { connectedAt: new Date().toISOString(), connectedBy: by });
      toast.success(upload ? "Exports received" : `${system} connected`, { description: "Pulling 24 months of history…" });
    }, 1200);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlugZap className="size-4 text-warning" aria-hidden /> Waiting for books access
          </CardTitle>
          <CardDescription>
            {accountant
              ? `${deal.prospect.contactName} was sent instructions to invite ${tenant.shortName} as an accountant user in ${system}. Once the invite arrives, connect QuoteIQ yourself; the prospect approves nothing new.`
              : upload
                ? `${deal.prospect.contactName} was sent a secure portal link to upload a trial balance, general ledger and bank statements.`
                : `${deal.prospect.contactName} was sent a secure portal link to connect ${system} (read-only use, revocable at any time).`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="grid gap-2 text-sm sm:grid-cols-3">
            {[
              { done: true, label: "Prospect created", hint: dateTime(deal.createdAt) },
              { done: true, label: accountant ? "Invite instructions sent" : "Portal link sent", hint: deal.prospect.contactEmail },
              { done: false, label: upload ? "Exports uploaded" : "Books connected", hint: "Auto-reminder after 24 h" },
            ].map((s) => (
              <li key={s.label} className="flex items-start gap-2 rounded-md border p-2.5">
                {s.done ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                ) : (
                  <Circle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                )}
                <span className="min-w-0">
                  <span className="block font-medium">{s.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{s.hint}</span>
                </span>
              </li>
            ))}
          </ol>
          <DemoNote>
            {accountant
              ? `Demo: click “Connect ${system}” to play the analyst connecting through the accountant invite, or open the portal to play ${contactFirst}.`
              : `Demo: open the portal to play ${contactFirst}. Keep this tab open; it updates by itself when they submit.`}
          </DemoNote>
        </CardContent>
        <CardFooter className="flex-wrap gap-2 border-t pt-4">
          {accountant ? (
            <Button onClick={() => simulate("Priya Sharma")} disabled={connecting}>
              {connecting ? <Loader2 className="animate-spin" /> : <PlugZap />}
              {connecting ? "Connecting…" : `Connect ${system} as accountant`}
            </Button>
          ) : null}
          <Button asChild variant={accountant ? "outline" : "default"}>
            <Link href={portalPath} target="_blank">
              Open prospect portal <ExternalLink />
            </Link>
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`${window.location.origin}${portalPath}`);
                toast.success("Portal link copied");
              } catch {
                toast.error("Couldn’t access the clipboard");
              }
            }}
          >
            <Copy /> Copy portal link
          </Button>
          {!accountant ? (
            <Button variant="ghost" onClick={() => simulate(deal.prospect.contactName)} disabled={connecting}>
              {connecting ? <Loader2 className="animate-spin" /> : null}
              Skip: simulate {contactFirst} {upload ? "uploading" : "connecting"}
            </Button>
          ) : null}
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What happens next</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>QuoteIQ pulls 24 months and ties the transactions out to the trial balance.</li>
            <li>35 deterministic checks score volume, books quality and complexity.</li>
            <li>The AI drafts a pre-call brief with questions for the consultation.</li>
            <li>You review the brief (~10 min) and schedule the call.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

// ── 2. Snapshot pull + analysis ─────────────────────────────────────────────

const TICK_MS = 380;

function Analysing() {
  const router = useRouter();
  const { deal, data } = useDealWorkspace();
  const phases = [
    ...data.snapshot.entities.map((e) => e.entity),
    "Tie out trial balance (24 month-ends)",
    "Run 35 analysis checks",
    "Draft pre-call brief",
  ];
  const [tick, setTick] = useState(0);
  const finished = useRef(false);

  const total = phases.length;

  useEffect(() => {
    const timer = window.setInterval(() => setTick((t) => Math.min(t + 1, total)), TICK_MS);
    return () => window.clearInterval(timer);
  }, [total]);

  useEffect(() => {
    if (tick < total || finished.current) return;
    finished.current = true;
    const timer = window.setTimeout(() => {
      updateProgress(deal.id, { analysedAt: new Date().toISOString() });
      toast.success("Analysis complete", {
        description: "The pre-call brief is ready to review.",
        action: { label: "Open brief", onClick: () => router.push(`/deals/${deal.id}/brief`) },
      });
    }, TICK_MS);
    return () => {
      window.clearTimeout(timer);
      finished.current = false;
    };
  }, [tick, total, deal.id, router]);

  const pct = Math.round((tick / phases.length) * 100);
  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin text-ai" aria-hidden /> Pulling and analysing {SYSTEM_LABEL[deal.system]} data
        </CardTitle>
        <CardDescription>One read-only snapshot of the last 24 months. No continuous sync.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Progress value={pct} aria-label="Analysis progress" className="flex-1" />
          <span className="num w-10 text-right text-sm text-muted-foreground">{pct}%</span>
        </div>
        <ul className="grid gap-1.5 text-sm sm:grid-cols-2" aria-live="polite">
          {phases.map((p, i) => (
            <li key={p} className={cn("flex items-center gap-2", i > tick && "text-muted-foreground")}>
              {i < tick ? (
                <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
              ) : i === tick ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-ai" aria-hidden />
              ) : (
                <Circle className="size-4 shrink-0" aria-hidden />
              )}
              <span className="truncate">{p}</span>
            </li>
          ))}
        </ul>
        <DemoNote>Demo: a real pull takes 3–15 minutes for a typical small business; it is sped up here.</DemoNote>
      </CardContent>
    </Card>
  );
}

// ── 3. Consultation ─────────────────────────────────────────────────────────

const WEBHOOK = {
  zoom: "Zoom recording.transcript_completed webhook",
  teams: "Microsoft Graph transcript notification",
  meet: "Google Workspace Events notification",
} as const;

function CallPending() {
  const { deal, data, scheduledCall, briefReviewed } = useDealWorkspace();
  const [stage, setStage] = useState(-1);

  if (!scheduledCall) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="size-4" aria-hidden /> Consultation not scheduled yet
          </CardTitle>
          <CardDescription>
            Schedule it from the pre-call brief. QuoteIQ creates the invite on your meeting platform and links it to this
            quote, so the transcript is matched automatically.
          </CardDescription>
        </CardHeader>
        <CardFooter className="gap-2 border-t pt-4">
          <Button asChild>
            <Link href={`/deals/${deal.id}/brief`}>{briefReviewed ? "Schedule consultation" : "Review brief & schedule"}</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const platform = scheduledCall.platform;
  const steps = [
    `Call ended on ${PLATFORM_LABEL[platform]} (${data.meeting.durationMinutes} min)`,
    `${WEBHOOK[platform]} received`,
    "Transcript downloaded and matched to this quote",
    "Requirements and brief answers extracted with citations",
    "Scope and packages drafted",
  ];

  const run = () => {
    setStage(0);
    steps.forEach((_, i) => {
      window.setTimeout(() => {
        setStage(i + 1);
        if (i === steps.length - 1) {
          const now = Date.now();
          updateProgress(deal.id, {
            callPlatform: platform,
            callStartedAt: new Date(now - (data.meeting.durationMinutes + 3) * 60_000).toISOString(),
            transcriptAt: new Date(now).toISOString(),
          });
          toast.success("Transcript received", { description: "Requirements extracted; scope and pricing drafted." });
        }
      }, (i + 1) * 650);
    });
  };

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="size-4 text-primary" aria-hidden /> Consultation scheduled
        </CardTitle>
        <CardDescription>
          {PLATFORM_LABEL[platform]} · {dateTime(scheduledCall.at)} PT. Hold the call as usual; no bot joins. When the
          recording finishes, {PLATFORM_LABEL[platform]} notifies QuoteIQ and the transcript is processed automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Pill tone="success">Transcript auto-fetch on</Pill>
          <Pill>Recording consent in invite</Pill>
        </div>
        {stage >= 0 ? (
          <ul className="space-y-1.5 text-sm" aria-live="polite">
            {steps.map((s, i) => (
              <li key={s} className={cn("flex items-center gap-2", i > stage && "text-muted-foreground")}>
                {i < stage ? (
                  <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
                ) : i === stage ? (
                  <Loader2 className="size-4 shrink-0 animate-spin text-ai" aria-hidden />
                ) : (
                  <Circle className="size-4 shrink-0" aria-hidden />
                )}
                {s}
              </li>
            ))}
          </ul>
        ) : null}
        <DemoNote>Demo: the call itself happens outside QuoteIQ. Click below to play the moment the transcript arrives.</DemoNote>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <Button onClick={run} disabled={stage >= 0}>
          {stage >= 0 ? <Loader2 className="animate-spin" /> : <FileText />}
          {stage >= 0 ? "Processing transcript…" : "Simulate: call ends, transcript arrives"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function NeedsCall({ step }: { step: Step }) {
  const { deal, scheduledCall } = useDealWorkspace();
  const what = step === "scope" ? "Scope is" : step === "pricing" ? "Pricing is" : "The proposal is";
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>{what} drafted after the consultation</CardTitle>
        <CardDescription>
          QuoteIQ merges the analysis with what the client asks for on the call, then the pricing engine computes the
          packages. Nothing is priced on data alone.
        </CardDescription>
      </CardHeader>
      <CardFooter className="gap-2 border-t pt-4">
        <Button asChild>
          <Link href={`/deals/${deal.id}/${scheduledCall ? "meeting" : "brief"}`}>
            {scheduledCall ? "Go to consultation" : "Schedule consultation"}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
