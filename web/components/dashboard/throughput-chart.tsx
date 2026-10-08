"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ThroughputChart({ data }: { data: { week: string; sent: number; avgTouch: number }[] }) {
  return (
    <div className="h-64 w-full" role="img" aria-label="Quotes sent per week and average human minutes per quote, last 8 weeks">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 224 }}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
          <YAxis yAxisId="left" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
          <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" unit="m" />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="left" dataKey="sent" name="Quotes sent" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          <Line yAxisId="right" dataKey="avgTouch" name="Avg human minutes / quote" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} type="monotone" isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
