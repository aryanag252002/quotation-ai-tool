import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleHelp,
  Database,
  Lock,
  MessageSquareText,
  Sparkles,
  TriangleAlert,
  UserPen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/format";
import type { Confidence, Rag, ScopeSource } from "@/lib/types";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground ring-border",
  info: "bg-info-soft text-info ring-info/20",
  ai: "bg-ai-soft text-ai ring-ai/20",
  success: "bg-success-soft text-success ring-success/20",
  warning: "bg-warning-soft text-warning ring-warning/25",
  danger: "bg-danger-soft text-danger ring-danger/20",
};

export function Pill({
  tone = "neutral",
  icon: Icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        TONE_CLASS[tone],
        className,
      )}
    >
      {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
      {children}
    </span>
  );
}

const RAG_META: Record<Rag, { label: string; tone: Tone; icon: React.ComponentType<{ className?: string }> }> = {
  green: { label: "Healthy", tone: "success", icon: CircleCheck },
  amber: { label: "Attention", tone: "warning", icon: TriangleAlert },
  red: { label: "Problem", tone: "danger", icon: CircleAlert },
  unknown: { label: "Unknown", tone: "neutral", icon: CircleHelp },
};

export function RagBadge({ rag, compact }: { rag: Rag | null; compact?: boolean }) {
  if (!rag) return <Pill icon={CircleDashed}>Driver</Pill>;
  const m = RAG_META[rag];
  return (
    <Pill tone={m.tone} icon={m.icon}>
      {compact ? <span className="sr-only">{m.label}</span> : m.label}
    </Pill>
  );
}

const SOURCE_META: Record<ScopeSource, { label: string; tone: Tone; icon: React.ComponentType<{ className?: string }> }> = {
  data: { label: "Data", tone: "info", icon: Database },
  call: { label: "Call", tone: "ai", icon: MessageSquareText },
  analyst: { label: "Analyst", tone: "neutral", icon: UserPen },
};

export function SourceBadge({ source }: { source: ScopeSource }) {
  const m = SOURCE_META[source];
  return (
    <Pill tone={m.tone} icon={m.icon}>
      {m.label}
    </Pill>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const tone: Tone = confidence === "high" ? "success" : confidence === "medium" ? "warning" : "danger";
  return <Pill tone={tone}>{confidence[0].toUpperCase() + confidence.slice(1)} confidence</Pill>;
}

export function AiBadge({ label = "AI draft" }: { label?: string }) {
  return (
    <Pill tone="ai" icon={Sparkles}>
      {label}
    </Pill>
  );
}

export function RequiredBadge() {
  return (
    <Pill tone="neutral" icon={Lock}>
      Required by data
    </Pill>
  );
}
