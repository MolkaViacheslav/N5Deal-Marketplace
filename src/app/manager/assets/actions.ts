"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";

// No Reactivate here: plan.md scopes /manager/assets to Suspend/Remove only,
// and AuditAction has no REACTIVATE_ASSET value. A listing suspended
// directly (rather than via the seller-status cascade in
// ../participants/actions.ts) has no path back to ACTIVE in this build —
// a deliberate scope cut, not an oversight.
//
// Expected failures are returned, not thrown — see the comment in
// ../participants/actions.ts for why (Next redacts thrown Server Action
// error messages in production).

const moderateAssetSchema = z.object({
  assetId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

type ModerateAssetInput = z.infer<typeof moderateAssetSchema>;

class GuardError extends Error {}

// Mirrors `revalidateListingPaths` in ../../seller/assets/actions.ts — a
// listing's moderation state is the one thing both buyer browse and the
// seller's own table render, so a manager's Suspend/Remove has to bust the
// same three surfaces a seller's own edit does.
function revalidateManagerPaths(assetId?: string) {
  revalidatePath("/manager");
  revalidatePath("/manager/assets");
  revalidatePath("/buyer/assets");
  revalidatePath("/seller/assets");
  if (assetId) revalidatePath(`/buyer/assets/${assetId}`);
}

async function runGuarded(
  transaction: () => Promise<void>,
  assetId?: string
): Promise<ActionResult> {
  try {
    await transaction();
  } catch (err) {
    if (err instanceof GuardError) return { success: false, error: err.message };
    throw err;
  }
  revalidateManagerPaths(assetId);
  return { success: true };
}

export async function suspendAsset(input: ModerateAssetInput): Promise<ActionResult> {
  const manager = await requireRole("MANAGER");
  const parsed = moderateAssetSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid request." };
  const { assetId, reason } = parsed.data;

  return runGuarded(async () => {
    await prisma.$transaction(async (tx) => {
      const target = await tx.asset.findUnique({ where: { id: assetId } });
      if (!target) throw new GuardError("Asset not found.");
      if (target.listingStatus !== "ACTIVE") {
        throw new GuardError("Only an active listing can be suspended.");
      }

      await tx.asset.update({ where: { id: assetId }, data: { listingStatus: "SUSPENDED" } });

      await logAction(tx, {
        actorId: manager.id,
        action: "SUSPEND_ASSET",
        targetType: "ASSET",
        targetId: assetId,
        reason,
      });
    });
  }, assetId);
}

export async function removeAsset(input: ModerateAssetInput): Promise<ActionResult> {
  const manager = await requireRole("MANAGER");
  const parsed = moderateAssetSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid request." };
  const { assetId, reason } = parsed.data;

  return runGuarded(async () => {
    await prisma.$transaction(async (tx) => {
      const target = await tx.asset.findUnique({ where: { id: assetId } });
      if (!target) throw new GuardError("Asset not found.");
      if (target.listingStatus === "REMOVED") {
        throw new GuardError("This listing has already been removed.");
      }

      await tx.asset.update({ where: { id: assetId }, data: { listingStatus: "REMOVED" } });

      await logAction(tx, {
        actorId: manager.id,
        action: "REMOVE_ASSET",
        targetType: "ASSET",
        targetId: assetId,
        reason,
      });
    });
  }, assetId);
}
