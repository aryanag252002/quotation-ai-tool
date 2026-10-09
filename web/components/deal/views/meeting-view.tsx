"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Copy, Mail, ShieldCheck, TriangleAlert, Video } from "lucide-react";
import { toast } from "sonner";
import { AiBadge, ConfidenceBadge, Pill } from "@/components/app/status";
import { CallStepper } from "@/components/deal/consultation-control";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { clock, dateTime, PLATFORM_LABEL } from "@/lib/format";
import { shortName } from "@/lib/data/generate";
import { useDealWorkspace } from "@/lib/state/deal-workspace";
import { cn } from "@/lib/utils";

export function MeetingView() {
  const { deal, data, briefQuestions, contradictionResolution, set } = useDealWorkspace();
  const { meeting, transcript, requirements, briefAnswers, contradictions, openItems } = data;
  const [active, setActive] = useState<string[]>([]);
  const segRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const segById = Object.fromEntries(transcript.map((s) => [s.id, s]));

  const cite = (ids: string[]) => {
    setActive(ids);
    segRefs.current[ids[0]]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const CiteButtons = ({ ids }: { ids: string[] }) => (
    <span className="inline-flex flex-wrap gap-1">
      {ids.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => cite(ids)}
          className="num rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label={`Show transcript at ${clock(segById[id].start)}`}
        >
          {clock(segById[id].start)}
        </button>
      ))}
    </span>
  );

  const hints: [string, string, string, string] = [
    `${PLATFORM_LABEL[meeting.platform]} · linked by calendar invite`,
    `Held ${dateTime(meeting.startedAt)} · ${meeting.durationMinutes} min`,
    `Received ${dateTime(meeting.transcriptReceivedAt)}`,
    `Extracted in ${Math.floor(meeting.extractionSeconds / 60)}m ${meeting.extractionSeconds % 60}s`,
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Video className="size-5" aria-hidden />
            </span>
            <div>
              <div className="font-medium">{meeting.title}</div>
              <div className="text-sm text-muted-foreground">
                {dateTime(meeting.startedAt)} PT · {meeting.attendees.length} attendees
              </div>
            </div>
          </div>
          <Pill tone="success" icon={CheckCircle2} className="lg:ml-auto">
            Call ended
          </Pill>
        </CardContent>
        <CardContent>
          <CallStepper phase="done" hints={hints} />
        </CardContent>
        <CardContent className="flex flex-wrap gap-2 border-t pt-3">
          <Pill tone="success" icon={ShieldCheck}>Recording consent logged</Pill>
          <Pill>No bot joined: native {PLATFORM_LABEL[meeting.platform]} transcript</Pill>
          <Pill>Matched to quote by calendar event ID</Pill>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Transcript</CardTitle>
            <CardDescription>Select a timestamp on the right to jump to the evidence.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <ScrollArea className="h-[560px]">
              <ol className="space-y-1 px-4">
                {transcript.map((s) => (
                  <li
                    key={s.id}
                    ref={(el) => {
                      segRefs.current[s.id] = el;
                    }}
                    className={cn(
                      "rounded-md p-2.5 transition-colors duration-200",
                      active.includes(s.id) ? "bg-warning-soft ring-1 ring-warning/40" : "hover:bg-muted/60",
                    )}
                  >
                    <div className="mb-0.5 flex items-center gap-2 text-xs">
                      <span className={cn("font-semibold", s.side === "kpo" ? "text-primary" : "text-foreground")}>{s.speaker}</span>
                      <span className="num text-muted-foreground">{clock(s.start)}</span>
                    </div>
                    <p className="text-sm leading-relaxed">{s.text}</p>
                  </li>
                ))}
              </ol>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              What we learned <AiBadge label="AI extracted" />
            </CardTitle>
            <CardDescription>Every item cites the transcript. Contradictions with the ledger are flagged for your decision.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="requirements">
              <TabsList className="flex-wrap">
                <TabsTrigger value="requirements">Requirements</TabsTrigger>
                <TabsTrigger value="answers">Brief answers</TabsTrigger>
                <TabsTrigger value="conflicts" className="gap-1.5">
                  Contradictions <span className="num rounded bg-warning-soft px-1 text-[11px] text-warning">{contradictions.length}</span>
                </TabsTrigger>
                <TabsTrigger value="open">Open items</TabsTrigger>
              </TabsList>

              <TabsContent value="requirements" className="mt-3">
                <ul className="divide-y rounded-md border">
                  {requirements.map((r) => (
                    <li key={r.id} className="flex flex-col gap-1.5 p-3 sm:flex-row sm:items-start sm:gap-3">
                      <div className="w-36 shrink-0 text-xs font-medium text-muted-foreground uppercase">{r.field}</div>
                      <div className="min-w-0 flex-1 text-sm">{r.value}</div>
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        <ConfidenceBadge confidence={r.confidence} />
                        <CiteButtons ids={r.segmentIds} />
                      </div>
                    </li>
                  ))}
                </ul>
              </TabsContent>

              <TabsContent value="answers" className="mt-3">
                <ul className="divide-y rounded-md border">
                  {briefQuestions.map((q) => {
                    const a = briefAnswers.find((x) => x.questionId === q.id);
                    return (
                      <li key={q.id} className="space-y-1 p-3">
                        <div className="text-sm font-medium">{q.question || "(empty question)"}</div>
                        {a ? (
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="size-4 text-success" aria-hidden /> {a.answer} <CiteButtons ids={a.segmentIds} />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-warning">
                            <TriangleAlert className="size-4" aria-hidden /> Not answered on the call: added to open items
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </TabsContent>

              <TabsContent value="conflicts" className="mt-3 space-y-3">
                {contradictions.length === 0 ? (
                  <p className="flex items-center gap-2 rounded-md border p-3 text-sm text-muted-foreground">
                    <CheckCircle2 className="size-4 text-success" aria-hidden /> What the client said matches the ledger.
                  </p>
                ) : null}
                {contradictions.map((c) => (
                  <div key={c.id} className="space-y-3 rounded-md border border-warning/40 bg-warning-soft/50 p-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <TriangleAlert className="size-4 text-warning" aria-hidden /> {c.topic}
                    </div>
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <div className="rounded-md bg-card p-2.5">
                        <div className="text-xs text-muted-foreground">Client said</div>
                        <div className="flex flex-wrap items-center gap-2">{c.clientSaid} <CiteButtons ids={c.segmentIds} /></div>
                      </div>
                      <div className="rounded-md bg-card p-2.5">
                        <div className="text-xs text-muted-foreground">Ledger shows ({c.signalId})</div>
                        <div className="num">{c.dataShows}</div>
                      </div>
                    </div>
                    <RadioGroup
                      value={contradictionResolution[c.id]}
                      onValueChange={(v) => {
                        set("contradictionResolution", { ...contradictionResolution, [c.id]: v as "data" | "client" });
                        toast.info("Scope and pricing updated", { description: v === "data" ? "Using the ledger volume." : "Using the client’s estimate (confidence lowered)." });
                      }}
                      className="flex flex-wrap gap-4"
                      aria-label="Which value should the quote use?"
                    >
                      <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
                        <RadioGroupItem value="data" /> Use ledger data (recommended)
                      </Label>
                      <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
                        <RadioGroupItem value="client" /> Use client’s estimate
                      </Label>
                    </RadioGroup>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="open" className="mt-3 space-y-3">
                <ul className="space-y-2">
                  {openItems.map((o) => (
                    <li key={o} className="flex items-start gap-2 rounded-md border p-2.5 text-sm">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden /> {o}
                    </li>
                  ))}
                </ul>
                <FollowUpDialog
                  contactFirstName={deal.prospect.contactName.split(" ")[0]}
                  company={shortName(deal.prospect.name)}
                  analyst={meeting.attendees[0]?.split(" (")[0] ?? "Priya"}
                  items={openItems}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FollowUpDialog({
  contactFirstName,
  company,
  analyst,
  items,
}: {
  contactFirstName: string;
  company: string;
  analyst: string;
  items: string[];
}) {
  const draft = `Hi ${contactFirstName},\n\nThanks for your time today. It was great to learn more about ${company}. To finalise your proposal, could you help us with a few items?\n\n${items
    .map((i) => `• ${i}`)
    .join("\n")}\n\nWe’ll send the proposal with a cleanup plan and package options by tomorrow.\n\nBest,\n${analyst.split(" ")[0]}`;
  const [text, setText] = useState(draft);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Mail /> Draft follow-up email
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Follow-up email <AiBadge />
          </DialogTitle>
          <DialogDescription>Drafted from the open items. Review before sending from your own mailbox.</DialogDescription>
        </DialogHeader>
        <Textarea aria-label="Email body" value={text} onChange={(e) => setText(e.target.value)} className="min-h-64 text-sm" />
        <DialogFooter>
          <Button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text);
                toast.success("Copied to clipboard");
              } catch {
                toast.error("Couldn’t access the clipboard");
              }
            }}
          >
            <Copy /> Copy email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
