"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calculator,
  ChevronsUpDown,
  ExternalLink,
  FileStack,
  LayoutDashboard,
  Plug,
  PlusCircle,
  ShieldCheck,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePricingConfig } from "@/lib/config/pricing-config-context";
import { ROLE_LABEL } from "@/lib/format";
import type { UserRole } from "@/lib/types";

const DEMO_USERS: Record<UserRole, { name: string; initials: string }> = {
  analyst: { name: "Priya Sharma", initials: "PS" },
  manager: { name: "Rahul Mehta", initials: "RM" },
  partner: { name: "Anita Desai", initials: "AD" },
};

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/deals", label: "Quotes pipeline", icon: FileStack, badge: "10" },
  { href: "/deals/new", label: "New prospect", icon: PlusCircle },
];

const CONFIG_NAV = [
  { href: "/settings", label: "Pricing & catalog", icon: Calculator },
  { href: "/settings?tab=approvals", label: "Approval rules", icon: ShieldCheck },
  { href: "/settings?tab=integrations", label: "Integrations", icon: Plug },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { role, setRole } = usePricingConfig();
  const user = DEMO_USERS[role];

  const isActive = (href: string) => {
    const path = href.split("?")[0];
    if (path === "/deals") return pathname === "/deals" || (pathname.startsWith("/deals/") && pathname !== "/deals/new");
    return pathname === path;
  };

  return (
    <Sidebar collapsible="icon" className="print:hidden">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <span className="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
                  Q
                </span>
                <span className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-semibold text-sidebar-accent-foreground">QuoteIQ</span>
                  <span className="truncate text-xs">Northstar Accounting</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Quoting</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.label}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.badge ? <SidebarMenuBadge className="num">{item.badge}</SidebarMenuBadge> : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Configuration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {CONFIG_NAV.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === "/settings" && item.href === "/settings"} tooltip={item.label}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Prospect view</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Prospect portal (preview)">
                  <Link href="/portal/brightside-demo" target="_blank">
                    <ExternalLink />
                    <span>Prospect portal</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" aria-label="Switch demo user">
                  <Avatar className="size-8 rounded-md">
                    <AvatarFallback className="rounded-md bg-sidebar-accent text-xs text-sidebar-accent-foreground">
                      {user.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="grid flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-medium text-sidebar-accent-foreground">{user.name}</span>
                    <span className="truncate text-xs">{ROLE_LABEL[role]}</span>
                  </span>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuLabel>View the demo as</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={role} onValueChange={(v) => setRole(v as UserRole)}>
                  {(Object.keys(DEMO_USERS) as UserRole[]).map((r) => (
                    <DropdownMenuRadioItem key={r} value={r}>
                      {DEMO_USERS[r].name} · {ROLE_LABEL[r]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
