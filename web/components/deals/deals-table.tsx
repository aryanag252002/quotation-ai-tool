"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Pill } from "@/components/app/status";
import { DealFee } from "@/components/deals/deal-fee";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DealWorkspaceData } from "@/lib/data";
import { duration, STAGE_BY_ID, SYSTEM_LABEL } from "@/lib/format";
import type { Deal, User } from "@/lib/types";

type Filter = "active" | "closed" | "all";

export function DealsTable({
  deals,
  users,
  workspaces,
}: {
  deals: Deal[];
  users: User[];
  workspaces: Record<string, DealWorkspaceData | null>;
}) {
  const [filter, setFilter] = useState<Filter>("active");
  const [query, setQuery] = useState("");
  const userById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);

  const rows = deals.filter((d) => {
    const closed = d.stage === "won" || d.stage === "lost";
    if (filter === "active" && closed) return false;
    if (filter === "closed" && !closed) return false;
    return d.prospect.name.toLowerCase().includes(query.trim().toLowerCase());
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="closed">Won / lost</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            aria-label="Search prospects"
            placeholder="Search prospects"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prospect</TableHead>
              <TableHead>Accounting system</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="text-right">Monthly fee</TableHead>
              <TableHead className="text-right">Human time</TableHead>
              <TableHead className="text-right">Age</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No quotes match your filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((d) => {
                const stage = STAGE_BY_ID[d.stage];
                return (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Link href={`/deals/${d.id}`} className="font-medium hover:underline focus-visible:underline focus-visible:outline-none">
                        {d.prospect.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{d.prospect.industryLabel} · {d.prospect.location}</div>
                    </TableCell>
                    <TableCell>{SYSTEM_LABEL[d.system]}</TableCell>
                    <TableCell>
                      <Pill tone={stage.tone}>{stage.label}</Pill>
                    </TableCell>
                    <TableCell>{userById[d.ownerId]?.name}</TableCell>
                    <TableCell className="text-right">
                      <DealFee deal={d} workspace={workspaces[d.id]} />
                    </TableCell>
                    <TableCell className="num text-right">{d.touchMinutes} min</TableCell>
                    <TableCell className="text-right text-muted-foreground">{duration(d.elapsedHours)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
