import { Skeleton } from "@/components/ui/skeleton";

export function DealSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading quote">
      <Skeleton className="h-14 w-2/3" />
      <Skeleton className="h-11 w-full" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 lg:col-span-2" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
