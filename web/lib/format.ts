import type { DealStage, Industry, LedgerSystem, MeetingPlatform, UserRole } from "@/lib/types";

const usdFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usd2Fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

export const usd = (n: number) => usdFmt.format(n);
export const usd2 = (n: number) => usd2Fmt.format(n);
export const int = (n: number) => Math.round(n).toLocaleString("en-US");
export const hrs = (n: number) => `${(Math.round(n * 10) / 10).toLocaleString("en-US")} h`;
export const pct = (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`;

export function dateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  });
}

export function date(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}

export function clock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function duration(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${Math.round(hours)} h`;
  return `${Math.round(hours / 24)} days`;
}

export const SYSTEM_LABEL: Record<LedgerSystem, string> = {
  qbo: "QuickBooks Online",
  xero: "Xero",
  zoho: "Zoho Books",
  sage: "Sage",
  netsuite: "NetSuite",
  upload: "File upload",
};

export const INDUSTRY_LABEL: Record<Industry, string> = {
  ecommerce: "E-commerce / retail",
  construction: "Construction / trades",
  nonprofit: "Non-profit",
  professional_services: "Professional services",
  healthcare: "Healthcare",
  real_estate: "Real estate",
  logistics: "Logistics",
  other: "Other",
};

export function monthName(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export const PLATFORM_LABEL: Record<MeetingPlatform, string> = {
  zoom: "Zoom",
  teams: "Microsoft Teams",
  meet: "Google Meet",
};

export const ROLE_LABEL: Record<UserRole, string> = {
  analyst: "Analyst",
  manager: "Manager",
  partner: "Partner",
};

export type Tone = "neutral" | "info" | "ai" | "success" | "warning" | "danger";

export const STAGES: { id: DealStage; label: string; tone: Tone }[] = [
  { id: "intake", label: "Intake", tone: "neutral" },
  { id: "awaiting_data", label: "Awaiting data", tone: "warning" },
  { id: "analyzing", label: "Analysing", tone: "ai" },
  { id: "brief_ready", label: "Brief ready", tone: "info" },
  { id: "call_scheduled", label: "Call scheduled", tone: "info" },
  { id: "scope_review", label: "Scope review", tone: "warning" },
  { id: "pending_approval", label: "Pending approval", tone: "warning" },
  { id: "sent", label: "Sent", tone: "info" },
  { id: "won", label: "Won", tone: "success" },
  { id: "lost", label: "Lost", tone: "neutral" },
];

export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s])) as Record<DealStage, (typeof STAGES)[number]>;
