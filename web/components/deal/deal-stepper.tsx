"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { currentStepIndex, DEAL_STEPS, stepHref } from "@/components/deal/steps";
import type { DealStage } from "@/lib/types";

export function DealStepper({ dealId, stage }: { dealId: string; stage: DealStage }) {
  const pathname = usePathname();
  const progress = currentStepIndex(stage);
  const viewing = DEAL_STEPS.findIndex((s) => pathname === stepHref(dealId, s.slug));

  return (
    <nav aria-label="Quote workflow" className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Step <span className="num">{viewing + 1}</span> of <span className="num">{DEAL_STEPS.length}</span>
        {progress < DEAL_STEPS.length ? (
          <>
            {" "}· quote is currently at <span className="font-medium text-foreground">{DEAL_STEPS[progress].label}</span>
          </>
        ) : (
          " · all steps complete"
        )}
      </p>
      <ol className="flex gap-1 overflow-x-auto rounded-lg border bg-card p-1">
        {DEAL_STEPS.map((step, i) => {
          const done = i < progress;
          const current = i === progress;
          const active = i === viewing;
          return (
            <li key={step.slug} className="min-w-fit flex-1">
              <Link
                href={stepHref(dealId, step.slug)}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-md px-2.5 text-sm whitespace-nowrap transition-colors duration-150",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  active ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ring-1 ring-inset",
                    active
                      ? "bg-primary-foreground/15 ring-primary-foreground/40"
                      : done
                        ? "bg-success-soft text-success ring-success/30"
                        : current
                          ? "bg-warning-soft text-warning ring-warning/40"
                          : "text-muted-foreground ring-border",
                  )}
                >
                  {done ? <Check className="size-3" aria-label="complete" /> : i + 1}
                </span>
                <span className="hidden lg:inline">{step.label}</span>
                <span className="lg:hidden">{step.short}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
