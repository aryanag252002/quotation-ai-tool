"use client";

/**
 * The consultation lifecycle on one page: schedule → hold the call → end it → transcript arrives.
 * The call itself runs on the KPO's own Zoom / Teams / Meet; for demo prospects, starting and
 * ending it are simulated here so the flow can be shown live.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CalendarClock,
  CalendarX2,
  CheckCircle2,
  Circle,
  FileText,
  Loader2,
  PhoneOff,
  Sparkles,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { Pill } from "@/components/app/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { clock, dateTime, PLATFORM_LABEL } from "@/lib/format";
import { updateProgress } from "@/lib/state/custom-deals";
import { useDealWorkspace } from "@/lib/state/deal-workspace";
import { cn } from "@/lib/utils";
import type { MeetingPlatform } from "@/lib/types";

const WEBHOOK = {
  zoom: "Zoom recording.transcript_completed webhook",
  teams: "Microsoft Graph transcript notification",
  meet: "Google Workspace Events notification",
} as const;

// ── Stepper ─────────────────────────────────────────────────────────────────

export type CallPhase = "unscheduled" | "scheduled" | "live" | "processing" | "done";

const PHASE_INDEX: Record<CallPhase, number> = { unscheduled: 0, scheduled: 1, live: 1, processing: 2, done: 4 };

export function CallStepper({ phase, hints }: { phase: CallPhase; hints: [string, string, string, string] }) {
  const current = PHASE_INDEX[phase];
  const labels = ["Schedule call", "Hold call", "Transcript", "Review"];
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Consultation progress">
      {labels.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const live = active && phase === "live";
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className={cn(
              "flex items-start gap-2.5 rounded-md border p-2.5",
              active && "border-primary/40 bg-accent",
              live && "border-danger/40 bg-danger-soft",
            )}
          >
            {done ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
            ) : live ? (
              <span className="relative mt-1 flex size-3 shrink-0" aria-hidden>
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex size-3 rounded-full bg-danger" />
              </span>
            ) : active && phase === "processing" ? (
              <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-ai" aria-hidden />
            ) : (
              <Circle className={cn("mt-0.5 size-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} aria-hidden />
            )}
            <span className="min-w-0">
              <span className={cn("block text-sm font-medium", !done && !active && "text-muted-foreground")}>
                <span className="num mr-1 text-xs text-muted-foreground">{i + 1}.</span>
                {label}
              </span>
              <span className="block truncate text-xs text-muted-foreground">{hints[i]}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ── Schedule dialog (shared with the pre-call brief) ────────────────────────

export function useScheduleCall() {
  const { set } = useDealWorkspace();
  return (platform: MeetingPlatform, at: string) => {
    set("scheduledCall", { platform, at });
    toast.success("Consultation scheduled", {
      description: `Calendar invite sent. The ${PLATFORM_LABEL[platform]} transcript will be fetched automatically after the call.`,
    });
  };
}

export function ScheduleCallDialog({ children }: { children: React.ReactNode }) {
  const { scheduledCall } = useDealWorkspace();
  const save = useScheduleCall();
  const [platform, setPlatform] = useState<MeetingPlatform>("zoom");
  const [at, setAt] = useState("");

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) return;
        setPlatform(scheduledCall?.platform ?? "zoom");
        setAt(toLocalInput(scheduledCall?.at ?? tomorrowAt10()));
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{scheduledCall ? "Reschedule consultation" : "Schedule consultation"}</DialogTitle>
          <DialogDescription>
            QuoteIQ creates the invite in your calendar and links the meeting to this quote, so the transcript is matched
            automatically when it’s ready.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Meeting platform</legend>
            <RadioGroup value={platform} onValueChange={(v) => setPlatform(v as MeetingPlatform)} className="grid grid-cols-3 gap-2">
              {(Object.keys(PLATFORM_LABEL) as MeetingPlatform[]).map((p) => (
                <Label
                  key={p}
                  htmlFor={`pf-${p}`}
                  className="flex cursor-pointer items-center gap-2 rounded-md border p-2.5 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-accent"
                >
                  <RadioGroupItem id={`pf-${p}`} value={p} />
                  {PLATFORM_LABEL[p]}
                </Label>
              ))}
            </RadioGroup>
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="call-at">Date and time</Label>
            <Input id="call-at" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
          </div>
          <p className="rounded-md bg-muted p-2.5 text-xs text-muted-foreground">
            After the call, {PLATFORM_LABEL[platform]} notifies QuoteIQ when the transcript is ready ({WEBHOOK[platform]}).
            Recording consent is included in the invite.
          </p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button disabled={!at} onClick={() => save(platform, new Date(at).toISOString())}>
              Save and send invite
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Before the transcript arrives ───────────────────────────────────────────

/** Consultation page until the transcript is in: schedule, start, end. */
export function ConsultationControl() {
  const { deal, data, scheduledCall, liveCallStartedAt, briefQuestions, set } = useDealWorkspace();
  const [processing, setProcessing] = useState(-1);
  const [asked, setAsked] = useState<string[]>([]);
  const elapsed = useElapsed(liveCallStartedAt);

  const platform = scheduledCall?.platform ?? "zoom";
  const phase: CallPhase = processing >= 0 ? "processing" : liveCallStartedAt ? "live" : scheduledCall ? "scheduled" : "unscheduled";

  const steps = [
    `${WEBHOOK[platform]} received`,
    "Transcript downloaded and matched to this quote",
    "Requirements and brief answers extracted with citations",
    "Scope and packages drafted",
  ];

  const start = () => {
    set("liveCallStartedAt", new Date().toISOString());
    toast.success(`Call started on ${PLATFORM_LABEL[platform]}`, { description: "Recording and transcription are on." });
  };

  const end = () => {
    setProcessing(0);
    steps.forEach((_, i) => {
      window.setTimeout(() => {
        setProcessing(i + 1);
        if (i < steps.length - 1) return;
        const now = Date.now();
        updateProgress(deal.id, {
          callPlatform: platform,
          callStartedAt: new Date(now - (data.meeting.durationMinutes + 3) * 60_000).toISOString(),
          transcriptAt: new Date(now).toISOString(),
        });
        set("liveCallStartedAt", null);
        toast.success("Transcript received", { description: "Requirements extracted; scope and pricing drafted." });
      }, (i + 1) * 650);
    });
  };

  const hints: [string, string, string, string] = [
    scheduledCall ? `${PLATFORM_LABEL[platform]} · ${dateTime(scheduledCall.at)}` : "Not scheduled",
    phase === "live" ? `In progress · ${clock(elapsed)}` : phase === "processing" ? "Ended" : "Waiting",
    phase === "processing" ? "Processing…" : "Arrives after the call",
    "Requirements and scope",
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent>
          <CallStepper phase={phase} hints={hints} />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="self-start xl:col-span-2">
          {phase === "unscheduled" ? (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="size-4" aria-hidden /> Schedule the consultation
                </CardTitle>
                <CardDescription>
                  Pick Zoom, Teams or Google Meet and a time. QuoteIQ sends the invite from your calendar and links the
                  meeting to this quote, so the transcript is matched automatically. No bot joins the call.
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex-wrap gap-2 border-t pt-4">
                <ScheduleCallDialog>
                  <Button>
                    <CalendarClock /> Schedule call
                  </Button>
                </ScheduleCallDialog>
                <Button asChild variant="outline">
                  <Link href={`/deals/${deal.id}/brief`}>Review pre-call brief</Link>
                </Button>
              </CardFooter>
            </>
          ) : phase === "scheduled" ? (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="size-4 text-primary" aria-hidden /> Call scheduled
                </CardTitle>
                <CardDescription>Start the call when the client joins. Recording and transcription start with it.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <CallDetails platform={platform} at={scheduledCall!.at} attendees={data.meeting.attendees} />
                <DemoNote>Demo: “Start call” plays the analyst opening the meeting on {PLATFORM_LABEL[platform]}.</DemoNote>
              </CardContent>
              <CardFooter className="flex-wrap gap-2 border-t pt-4">
                <Button onClick={start}>
                  <Video /> Start call
                </Button>
                <ScheduleCallDialog>
                  <Button variant="outline">
                    <CalendarClock /> Reschedule
                  </Button>
                </ScheduleCallDialog>
                <Button
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => {
                    set("scheduledCall", null);
                    toast.info("Consultation cancelled", { description: "The calendar invite was withdrawn." });
                  }}
                >
                  <CalendarX2 /> Cancel call
                </Button>
              </CardFooter>
            </>
          ) : phase === "live" ? (
            <>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  <span className="relative flex size-2.5" aria-hidden>
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-60 motion-reduce:animate-none" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-danger" />
                  </span>
                  Call in progress
                  <span className="num ml-1 text-base font-semibold" aria-label={`Elapsed ${clock(elapsed)}`}>
                    {clock(elapsed)}
                  </span>
                </CardTitle>
                <CardDescription>
                  Recording on {PLATFORM_LABEL[platform]}. When you end the call, the transcript is fetched and processed
                  automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <CallDetails platform={platform} at={liveCallStartedAt!} attendees={data.meeting.attendees} live />
                <DemoNote>Demo: ending the call plays the transcript arriving, using a sample conversation for this prospect.</DemoNote>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button onClick={end} className="bg-danger text-white hover:bg-danger/85 focus-visible:ring-danger/40 dark:text-background">
                  <PhoneOff /> End call
                </Button>
              </CardFooter>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="size-4 text-ai" aria-hidden /> Call ended · processing transcript
                </CardTitle>
                <CardDescription>This usually takes 2–5 minutes after the recording finishes.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm" aria-live="polite">
                  {steps.map((s, i) => (
                    <li key={s} className={cn("flex items-center gap-2", i > processing && "text-muted-foreground")}>
                      {i < processing ? (
                        <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
                      ) : i === processing ? (
                        <Loader2 className="size-4 shrink-0 animate-spin text-ai" aria-hidden />
                      ) : (
                        <Circle className="size-4 shrink-0" aria-hidden />
                      )}
                      {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Questions to cover</CardTitle>
            <CardDescription>
              {phase === "live" ? "Tick them off as you go." : "From the pre-call brief. Answers are matched from the transcript."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {briefQuestions.filter((q) => q.question.trim()).map((q, i) => (
                <li key={q.id} className="flex items-start gap-2 text-sm">
                  {phase === "live" ? (
                    <Checkbox
                      id={`ask-${q.id}`}
                      className="mt-0.5"
                      checked={asked.includes(q.id)}
                      onCheckedChange={(v) => setAsked((a) => (v === true ? [...a, q.id] : a.filter((x) => x !== q.id)))}
                    />
                  ) : (
                    <span className="num w-4 shrink-0 text-right text-xs text-muted-foreground">{i + 1}.</span>
                  )}
                  <label htmlFor={`ask-${q.id}`} className={cn(asked.includes(q.id) && "text-muted-foreground line-through")}>
                    {q.question}
                  </label>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CallDetails({ platform, at, attendees, live }: { platform: MeetingPlatform; at: string; attendees: string[]; live?: boolean }) {
  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-3">
        <Video className="size-5 text-primary" aria-hidden />
        <div className="text-sm">
          <div className="font-medium">{PLATFORM_LABEL[platform]}</div>
          <div className="text-muted-foreground">
            {live ? "Started" : "Starts"} {dateTime(at)} PT
          </div>
        </div>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <Pill tone="success">Transcript auto-fetch on</Pill>
          <Pill>Recording consent in invite</Pill>
        </div>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {attendees.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
    </div>
  );
}

function DemoNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-md border border-dashed bg-muted/40 p-2.5 text-xs text-muted-foreground">
      <Sparkles className="mt-0.5 size-3.5 shrink-0 text-ai" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/** Seconds since `since`, ticking every second (0 before mount, so server and client agree). */
function useElapsed(since: string | null) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!since) return;
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const t = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, [since]);
  if (!since || now === null) return 0;
  return Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000));
}

/** ISO → value for <input type="datetime-local"> in the viewer's time zone. */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function tomorrowAt10() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}
