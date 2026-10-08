import { int } from "@/lib/format";
import type { WorkloadDrivers } from "@/lib/types";

/** Assumptions printed in the proposal; derived from the drivers and scope decisions. */
export function buildAssumptions(
  drivers: WorkloadDrivers,
  scopeIncluded: Record<string, boolean>,
  ctx: { clientName: string; payrollProvider: string | null },
): string[] {
  const employees = Math.round(drivers.payrollEmployeeRuns / Math.max(1, drivers.payrollRuns));
  return [
    `Sized on ${int(drivers.bankCardTxns)} bank and card transactions a month; the fee moves to the next band if volume exceeds ${int(drivers.bankCardTxns * 1.2)} for 2 consecutive months.`,
    ...(drivers.payrollRuns
      ? [`Payroll runs ${drivers.payrollRuns} times a month${ctx.payrollProvider ? ` through ${ctx.payrollProvider}` : ""} for about ${employees} employees.`]
      : []),
    scopeIncluded.collections ? "Collections follow-up is handled by us." : `Collections follow-up stays with ${ctx.clientName}.`,
    scopeIncluded.inventory || drivers.hasInventory ? "Inventory accounting is in scope." : "Inventory accounting is out of scope for now.",
    "Monthly close deadlines start after the cleanup project is complete and bank statements are available.",
  ];
}
