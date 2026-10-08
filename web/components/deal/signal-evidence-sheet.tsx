"use client";

import { Database, FileSearch } from "lucide-react";
import { RagBadge } from "@/components/app/status";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { GROUP_LABELS, type RatedSignal } from "@/lib/engine/analysis";

export function SignalEvidenceSheet({
  signal,
  onOpenChange,
}: {
  signal: RatedSignal | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={!!signal} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        {signal ? (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <span className="num text-muted-foreground">{signal.id}</span> {signal.name}
              </SheetTitle>
              <SheetDescription>{GROUP_LABELS[signal.group]} signal · computed deterministically from the ledger</SheetDescription>
            </SheetHeader>
            <div className="space-y-5 px-4 pb-6 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <div className="text-xs text-muted-foreground">Value</div>
                  <div className="num text-lg font-semibold">{signal.value.display}</div>
                </div>
                <RagBadge rag={signal.rag} />
              </div>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-muted-foreground">Thresholds (green / amber / red)</dt>
                  <dd className="num">{signal.thresholds}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Effect on the quote</dt>
                  <dd>{signal.effect}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Database className="size-3.5" aria-hidden /> Source
                  </dt>
                  <dd>{signal.source}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FileSearch className="size-3.5" aria-hidden /> Evidence
                  </dt>
                  <dd className="rounded-md bg-muted p-2.5">{signal.value.evidence}</dd>
                </div>
              </dl>
              <p className="text-xs text-muted-foreground">
                In production, this drawer links to the underlying transactions and the exact query used, so every
                number in the proposal can be traced back to the books.
              </p>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
