"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useMemo } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { useCustomDeals } from "@/lib/state/custom-deals";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  deals: "Quotes pipeline",
  new: "New prospect",
  settings: "Pricing & catalog",
  analysis: "Analysis",
  requests: "Document request",
  brief: "Pre-call brief",
  meeting: "Consultation",
  scope: "Scope",
  pricing: "Pricing",
  proposal: "Approval & proposal",
  brightside: "Brightside Coffee Roasters",
};

function labelFor(segment: string, custom: Record<string, string>) {
  return LABELS[segment] ?? custom[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function AppHeader() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const customDeals = useCustomDeals();
  const customNames = useMemo(() => Object.fromEntries(customDeals.map((d) => [d.id, d.prospect.name])), [customDeals]);

  return (
    <header className="sticky top-0 z-20 flex print:hidden h-12 shrink-0 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <SidebarTrigger className="-ml-1" aria-label="Toggle sidebar" />
      <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList className="flex-nowrap">
          {segments.map((seg, i) => {
            const href = "/" + segments.slice(0, i + 1).join("/");
            const last = i === segments.length - 1;
            return (
              <Fragment key={href}>
                {i > 0 ? <BreadcrumbSeparator /> : null}
                <BreadcrumbItem className="min-w-0">
                  {last ? (
                    <BreadcrumbPage className="truncate">{labelFor(seg, customNames)}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild className="truncate">
                      <Link href={href}>{labelFor(seg, customNames)}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
      <ThemeToggle />
    </header>
  );
}
