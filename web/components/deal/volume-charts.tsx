"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { monthLabel } from "@/lib/format";
import type { MonthlyVolume } from "@/lib/types";

const tooltipStyle = {
  contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 },
  labelStyle: { color: "var(--foreground)", fontWeight: 600 },
};

export function BankCardChart({ data, sized }: { data: MonthlyVolume[]; sized: number }) {
  const rows = data.map((d) => ({ ...d, label: monthLabel(d.month) }));
  return (
    <div className="h-56 w-full" role="img" aria-label={`Monthly bank and card transactions over 24 months; sized volume ${sized} per month`}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 224 }}>
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" interval={2} />
          <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
          <Tooltip cursor={{ fill: "var(--muted)" }} {...tooltipStyle} />
          <Bar dataKey="bankCard" name="Bank + card txns" fill="var(--chart-2)" radius={[3, 3, 0, 0]} maxBarSize={18} isAnimationActive={false} />
          <ReferenceLine y={sized} stroke="var(--foreground)" strokeOpacity={0.7} strokeDasharray="4 3" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DocumentsChart({ data }: { data: MonthlyVolume[] }) {
  const rows = data.map((d) => ({ ...d, label: monthLabel(d.month) }));
  return (
    <div className="h-56 w-full" role="img" aria-label="Monthly invoices, bills and journal entries over 24 months">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 224 }}>
        <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" interval={2} />
          <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
          <Tooltip {...tooltipStyle} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Line dataKey="bills" name="Bills" stroke="var(--chart-1)" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line dataKey="invoices" name="Invoices" stroke="var(--chart-3)" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line dataKey="journals" name="Manual JEs" stroke="var(--chart-4)" strokeWidth={2} dot={false} strokeDasharray="4 3" isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
