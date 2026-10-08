"use client";

import { useState } from "react";
import { CalendarClock, CheckCircle2, CircleAlert, Plus, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { AiBadge, Pill } from "@/components/app/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import { dateTime, PLATFORM_LABEL } from "@/lib/format";
import { useDealWorkspace } from "@/lib/state/deal-workspace";
import type { MeetingPlatform } from "@/lib/types";

export function BriefView() {
  const { data, briefQuestions, briefReviewed, scheduledCall, findingStatus, set } = useDealWorkspace();
  const flags = data.findings.filter((f) => f.severity !== "low" && findingStatus[f.id] !== "rejected");

  const updateQuestion = (id: string, question: string) =>
    set("briefQuestions", briefQuestions.map((q) => (q.id === id ? { ...q, question } : q)));
  const removeQuestion = (id: string) => set("briefQuestions", briefQuestions.filter((q) => q.id !== id));
  const addQuestion = () =>
    set("briefQuestions", [...briefQuestions, { id: `custom-${Date.now()}`, question: "", why: "Added by analyst" }]);

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              Prospect summary <AiBadge />
            </CardTitle>
            <CardDescription>Written from the analysis and questionnaire. Figures are inserted from computed signals.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-pretty">{data.briefSummary}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Questions for the call</CardTitle>
            <CardDescription>
              Generated for every red signal and every gap the accounting API can’t see. Edit freely; answers are
              matched automatically from the transcript.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <ol className="space-y-2">
              {briefQuestions.map((q, i) => (
                <li key={q.id} className="flex items-start gap-2 rounded-md border p-2.5">
                  <span className="num mt-2 w-5 shrink-0 text-right text-xs text-muted-foreground">{i + 1}.</span>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Input
                      aria-label={`Question ${i + 1}`}
                      value={q.question}
                      placeholder="Type a question"
                      onChange={(e) => updateQuestion(q.id, e.target.value)}
                    />
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      {q.signalId ? <span className="num rounded border px-1.5 py-0.5">{q.signalId}</span> : null}
                      <span>{q.why}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" aria-label={`Remove question ${i + 1}`} onClick={() => removeQuestion(q.id)}>
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ol>
            <Button variant="outline" size="sm" onClick={addQuestion}>
              <Plus /> Add question
            </Button>
          </CardContent>
          <CardFooter className="justify-between gap-2 border-t bg-muted/40 py-3">
            {briefReviewed ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-success">
                <CheckCircle2 className="size-4" aria-hidden /> Reviewed by Priya Sharma · 8 min
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">Not reviewed yet</span>
            )}
            <Button
              size="sm"
              variant={briefReviewed ? "outline" : "default"}
              onClick={() => {
                set("briefReviewed", !briefReviewed);
                if (!briefReviewed) toast.success("Brief marked as reviewed");
              }}
            >
              {briefReviewed ? "Mark as not reviewed" : "Mark brief reviewed"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="space-y-4">
        <ScheduleCard
          scheduled={scheduledCall}
          onSave={(platform, at) => {
            set("scheduledCall", { platform, at });
            toast.success("Consultation scheduled", {
              description: `Calendar invite sent. The ${PLATFORM_LABEL[platform]} transcript will be fetched automatically after the call.`,
            });
          }}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleAlert className="size-4 text-danger" aria-hidden /> Red flags to raise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {flags.map((f) => (
                <li key={f.id} className="text-sm">
                  <div className="font-medium">{f.title}</div>
                  <div className="text-xs text-muted-foreground">{f.signalIds.join(" · ")}</div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ScheduleCard({
  scheduled,
  onSave,
}: {
  scheduled: { platform: MeetingPlatform; at: string } | null;
  onSave: (platform: MeetingPlatform, at: string) => void;
}) {
  const [platform, setPlatform] = useState<MeetingPlatform>(scheduled?.platform ?? "zoom");
  const [at, setAt] = useState((scheduled?.at ?? "2026-10-07T17:00:00Z").slice(0, 16));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="size-4" aria-hidden /> Consultation
        </CardTitle>
        <CardDescription>Runs on your existing meeting platform. No recording app or bot is needed.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {scheduled ? (
          <div className="flex items-center gap-3 rounded-md border p-3">
            <Video className="size-5 text-primary" aria-hidden />
            <div className="text-sm">
              <div className="font-medium">{PLATFORM_LABEL[scheduled.platform]}</div>
              <div className="text-muted-foreground">{dateTime(scheduled.at)} PT</div>
            </div>
            <Pill tone="success" className="ml-auto">
              Transcript auto-fetch on
            </Pill>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Not scheduled yet.</p>
        )}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              {scheduled ? "Reschedule" : "Schedule consultation"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule consultation</DialogTitle>
              <DialogDescription>
                QuoteIQ creates the invite in your calendar and links the meeting to this quote, so the transcript is
                matched automatically when it’s ready.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Meeting platform</legend>
                <RadioGroup value={platform} onValueChange={(v) => setPlatform(v as MeetingPlatform)} className="grid grid-cols-3 gap-2">
                  {(Object.keys(PLATFORM_LABEL) as MeetingPlatform[]).map((p) => (
                    <Label key={p} htmlFor={`pf-${p}`} className="flex cursor-pointer items-center gap-2 rounded-md border p-2.5 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-accent">
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
                After the call, {PLATFORM_LABEL[platform]} notifies QuoteIQ when the transcript is ready (
                {platform === "zoom" ? "recording.transcript_completed webhook" : platform === "teams" ? "Microsoft Graph transcript subscription" : "Google Workspace Events subscription"}
                ). Recording consent is included in the invite.
              </p>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button onClick={() => onSave(platform, new Date(at).toISOString())}>Save and send invite</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
