import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { PortalView } from "@/components/portal/portal-view";
import { getDeal, getTenant } from "@/lib/data";

export const metadata: Metadata = { title: "Secure data connection" };

export async function generateStaticParams() {
  return [{ token: "brightside-demo" }];
}

// The token → deal lookup (expiring magic link) happens server-side in production; the demo maps every token to Brightside.
export default async function PortalPage() {
  const [tenant, deal] = await Promise.all([getTenant(), getDeal("brightside")]);
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
        <PortalView prospect={deal?.prospect.name ?? "your company"} kpo={tenant.shortName} />
      </main>
    </div>
  );
}
