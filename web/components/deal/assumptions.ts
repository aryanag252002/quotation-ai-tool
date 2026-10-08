import { int } from "@/lib/format";
import type { WorkloadDrivers } from "@/lib/types";

/** Assumptions printed in the proposal; derived from the drivers and scope decisions. */
export function buildAssumptions(drivers: WorkloadDrivers, scopeIncluded: Record<string, boolean>): string[] {
  return [
    `Sized on ${int(drivers.bankCardTxns)} bank and card transactions a month; the fee moves to the next band if volume exceeds ${int(drivers.bankCardTxns * 1.2)} for 2 consecutive months.`,
    `Payroll runs ${drivers.payrollRuns} times a month through Gusto for about ${Math.round(drivers.payrollEmployeeRuns / Math.max(1, drivers.payrollRuns))} employees.`,
    scopeIncluded.collections ? "Collections follow-up is handled by us." : "Collections follow-up stays with Brightside.",
    scopeIncluded.inventory ? "Inventory accounting is in scope." : "Inventory accounting is out of scope until 2027.",
    "Monthly close deadlines start after the cleanup project is complete and bank statements are available.",
  ];
}
