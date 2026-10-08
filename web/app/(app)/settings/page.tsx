import { Suspense } from "react";
import type { Metadata } from "next";
import { SettingsView } from "@/components/settings/settings-view";
import { Skeleton } from "@/components/ui/skeleton";
import { getDealWorkspace } from "@/lib/data";

export const metadata: Metadata = { title: "Pricing & catalog" };

export default async function SettingsPage() {
  const preview = await getDealWorkspace("brightside");
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <SettingsView preview={preview} />
    </Suspense>
  );
}
