import { Suspense } from "react";
import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { PortalView } from "@/components/portal/portal-view";
import { Skeleton } from "@/components/ui/skeleton";
import { getDeal, getTenant } from "@/lib/data";

export const metadata: Metadata = { title: "Secure data connection" };

export async function generateStaticParams() {
  return [{ token: "brightside-demo" }];
}

// In production the token is an expiring magic link resolved server-side. In the demo,
// "brightside-demo" maps to Brightside and any other token is a prospect added in this browser.
export default async function PortalPage({ params }: PageProps<"/portal/[token]">) {
  const tenant = await getTenant();
  return (
    <div className="min-h-svh bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">N</span>
            <span className="font-semibold">{tenant.name}</span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-success" aria-hidden /> Secure, encrypted connection
          </span>
        </div>
      </header>
      <main className="px-4 py-10">
        <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-3xl" />}>
          {params.then(async ({ token }) => {
            const seeded = token === "brightside-demo" ? await getDeal("brightside") : undefined;
            return <PortalView token={token} prospect={seeded?.prospect.name ?? null} kpo={tenant.shortName} />;
          })}
        </Suspense>
      </main>
    </div>
  );
}
