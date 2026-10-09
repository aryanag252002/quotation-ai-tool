"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, CircleAlert, Plus, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { AiBadge, Pill } from "@/components/app/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScheduleCallDialog } from "@/components/deal/consultation-control";
import { Input } from "@/components/ui/input";
import { dateTime, PLATFORM_LABEL } from "@/lib/format";
import { useDealWorkspace } from "@/lib/state/deal-workspace";

export function BriefView() {
  const { data, briefQuestions, briefReviewed, findingStatus, set } = useDealWorkspace();
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
        <ScheduleCard />

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

function ScheduleCard() {
  const { deal, scheduledCall, milestones } = useDealWorkspace();
  const held = milestones.callHeld;
  const href = `/deals/${deal.id}/meeting`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="size-4" aria-hidden /> Consultation
        </CardTitle>
        <CardDescription>Runs on your existing meeting platform. No recording app or bot is needed.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {scheduledCall ? (
          <div className="flex flex-wrap items-center gap-3 rounded-md border p-3">
            <Video className="size-5 text-primary" aria-hidden />
            <div className="text-sm">
              <div className="font-medium">{PLATFORM_LABEL[scheduledCall.platform]}</div>
              <div className="text-muted-foreground">{dateTime(scheduledCall.at)} PT</div>
            </div>
            <Pill tone="success" className="ml-auto">
              {held ? "Call held" : "Scheduled"}
            </Pill>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Not scheduled yet.</p>
        )}
        {held ? (
          <Button asChild size="sm" className="w-full">
            <Link href={href}>
              View transcript <ArrowRight />
            </Link>
          </Button>
        ) : scheduledCall ? (
          <div className="flex gap-2">
            <ScheduleCallDialog>
              <Button variant="outline" size="sm" className="flex-1">
                Reschedule
              </Button>
            </ScheduleCallDialog>
            <Button asChild size="sm" className="flex-1">
              <Link href={href}>
                Go to call <ArrowRight />
              </Link>
            </Button>
          </div>
        ) : (
          <ScheduleCallDialog>
            <Button size="sm" className="w-full">
              <CalendarClock /> Schedule call
            </Button>
          </ScheduleCallDialog>
        )}
      </CardContent>
    </Card>
  );
}
