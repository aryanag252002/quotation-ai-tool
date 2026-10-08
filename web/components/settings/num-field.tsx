"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function NumField({
  label,
  value,
  onChange,
  suffix,
  prefix,
  step = 1,
  min = 0,
  hideLabel,
  className,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  prefix?: string;
  step?: number;
  min?: number;
  hideLabel?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("space-y-1", className)}>
      <Label htmlFor={id} className={cn("text-xs text-muted-foreground", hideLabel && "sr-only")}>
        {label}
      </Label>
      <div className="flex items-center gap-1.5">
        {prefix ? <span className="text-sm text-muted-foreground">{prefix}</span> : null}
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => {
            const v = e.target.valueAsNumber;
            if (Number.isFinite(v) && v >= min) onChange(v);
          }}
          className="num h-8 w-24"
        />
        {suffix ? <span className="text-sm whitespace-nowrap text-muted-foreground">{suffix}</span> : null}
      </div>
    </div>
  );
}
