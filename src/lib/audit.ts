// Audit-log writes and reads for Manager moderation actions.
//
// Writes always happen through `logAction()`, called from inside the same
// Prisma `$transaction` as the status change it records (see the Server
// Actions in src/app/manager/**/actions.ts) — never as a bare write after
// the fact, or a crash between the two would leave the change unaudited.

import "server-only";

import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type { AuditAction } from "@/generated/prisma/enums";

export async function logAction(
  tx: Prisma.TransactionClient,
  params: {
    actorId: string;
    action: AuditAction;
    targetType: "USER" | "ASSET";
    targetId: string;
    reason?: string;
  }
): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      reason: params.reason ?? null,
    },
  });
}

export type AuditLogEntry = {
  id: string;
  actorName: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  /** Human-readable stand-in for targetId (a name/title, not a FK lookup —
   *  see below). Falls back to the raw id itself if the target can't be
   *  resolved, which shouldn't happen given soft-delete, but the id is right
   *  there either way. */
  targetLabel: string;
  reason: string | null;
  createdAt: Date;
};

/**
 * Latest moderation actions, newest first, for the /manager overview table.
 *
 * `AuditLog.targetId` isn't a foreign key (a per-target-type FK would mean
 * two nullable relations for one column), so the label is resolved with two
 * extra batch lookups rather than a `include`.
 */
export async function getRecentAuditLog(limit: number): Promise<AuditLogEntry[]> {
  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { actor: { select: { name: true } } },
  });

  const userIds = entries.filter((e) => e.targetType === "USER").map((e) => e.targetId);
  const assetIds = entries.filter((e) => e.targetType === "ASSET").map((e) => e.targetId);

  const [users, assets] = await Promise.all([
    userIds.length
      ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
    assetIds.length
      ? prisma.asset.findMany({ where: { id: { in: assetIds } }, select: { id: true, title: true } })
      : Promise.resolve([]),
  ]);

  const userLabel = new Map(users.map((u) => [u.id, u.name]));
  const assetLabel = new Map(assets.map((a) => [a.id, a.title]));

  return entries.map((entry) => ({
    id: entry.id,
    actorName: entry.actor.name,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    targetLabel:
      (entry.targetType === "USER"
        ? userLabel.get(entry.targetId)
        : assetLabel.get(entry.targetId)) ?? entry.targetId,
    reason: entry.reason,
    createdAt: entry.createdAt,
  }));
}
