import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";

import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { getRecentAuditLog } from "@/lib/audit";
import { StatCard } from "@/components/manager/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/taxonomy";
import type { AuditAction } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Overview" };

const ACTION_LABEL: Record<AuditAction, string> = {
  SUSPEND_USER: "Suspended user",
  REMOVE_USER: "Removed user",
  REACTIVATE_USER: "Reactivated user",
  SUSPEND_ASSET: "Suspended listing",
  REMOVE_ASSET: "Removed listing",
};

export default async function ManagerOverviewPage() {
  // Same defense-in-depth reasoning as the other two manager pages.
  await requireRole("MANAGER");

  const [activeBuyers, activeSellers, activeListings, inactiveUsers, recentActivity] =
    await Promise.all([
      prisma.user.count({ where: { role: "BUYER", status: "ACTIVE" } }),
      prisma.user.count({ where: { role: "SELLER", status: "ACTIVE" } }),
      prisma.asset.count({ where: { listingStatus: "ACTIVE" } }),
      prisma.user.count({ where: { role: { in: ["BUYER", "SELLER"] }, status: { not: "ACTIVE" } } }),
      getRecentAuditLog(10),
    ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active buyers" value={activeBuyers} />
        <StatCard label="Active sellers" value={activeSellers} />
        <StatCard label="Active listings" value={activeListings} />
        <StatCard label="Suspended / removed" value={inactiveUsers} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent moderation activity</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Inline rather than its own component like the other four empty
              states: there's exactly one caller, and it already lives inside
              this Card's own border — a second nested Card would double the
              framing for no reason. `py-10`, not `py-16`, for the same
              reason: the surrounding CardHeader already spends some of that
              vertical space. */}
          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <ClipboardList
                className="size-8 text-muted-foreground"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <p className="font-medium">No actions recorded yet</p>
                <p className="max-w-md text-sm text-muted-foreground">
                  Suspend, remove or reactivate a participant or a listing and
                  it will show up here.
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.actorName}</TableCell>
                    <TableCell>{ACTION_LABEL[entry.action]}</TableCell>
                    <TableCell title={`${entry.targetType} · ${entry.targetId}`}>
                      {entry.targetLabel}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.reason ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
