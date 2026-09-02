"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";

// Layer 3 of the access-control chain (CLAUDE.md → Conventions): the
// participants table only ever renders Suspend/Remove/Reactivate for a
// Buyer or Seller row, but a Server Action is a directly-callable endpoint —
// the guards below (self, other-manager, current-status) are re-checked here
// regardless of what the client sent.
//
// Expected failures (bad input, guard rejections) are RETURNED, never
// thrown: Next redacts a thrown Server Action error's message in production
// builds down to a generic "omitted in production builds" string — the
// client would never see "Cannot modify another manager." on the deployed
// app. `GuardError` marks the handful of throws that happen inside the
// transaction (kept there so the guard check and the read it depends on are
// atomic) as expected, so they get converted back to a normal return value
// instead of propagating as an uncaught error.

const moderateUserSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

type ModerateUserInput = z.infer<typeof moderateUserSchema>;

class GuardError extends Error {}

/**
 * Undo the seller-suspension cascade — and only that.
 *
 * A seller's listing can be SUSPENDED for two unrelated reasons: because this
 * cascade suspended it along with its seller, or because a manager suspended
 * that one listing on its own merits. Restoring both — which a bare
 * `updateMany({ sellerId, listingStatus: "SUSPENDED" })` does — silently
 * un-moderates the second kind. Demonstrated against the seed: reactivating
 * the seller of the "guaranteed regulatory approval" listing put that listing
 * back in front of every buyer, three days after a manager had pulled it.
 *
 * The two are told apart by the audit log: a directly-suspended listing has a
 * SUSPEND_ASSET row of its own, and a cascaded one does not. That is exact
 * *while this build has no asset-level Reactivate* (plan.md scopes
 * /manager/assets to Suspend/Remove), because there is then no way for such a
 * row to be stale. **If asset-level Reactivate is ever added, this rule has to
 * become an explicit flag on Asset instead** — the audit log would no longer
 * say what is true now, only what was true once.
 */
async function restoreCascadedListings(
  tx: Prisma.TransactionClient,
  sellerId: string
): Promise<void> {
  const suspended = await tx.asset.findMany({
    where: { sellerId, listingStatus: "SUSPENDED" },
    select: { id: true },
  });
  if (suspended.length === 0) return;

  const moderated = await tx.auditLog.findMany({
    where: {
      action: "SUSPEND_ASSET",
      targetId: { in: suspended.map((asset) => asset.id) },
    },
    select: { targetId: true },
  });

  const moderatedIds = new Set(moderated.map((row) => row.targetId));
  const toRestore = suspended
    .filter((asset) => !moderatedIds.has(asset.id))
    .map((asset) => asset.id);

  if (toRestore.length === 0) return;

  await tx.asset.updateMany({
    where: { id: { in: toRestore } },
    data: { listingStatus: "ACTIVE" },
  });
}

function revalidateManagerPaths() {
  revalidatePath("/manager");
  revalidatePath("/manager/participants");
  revalidatePath("/manager/assets");
}

async function runGuarded(transaction: () => Promise<void>): Promise<ActionResult> {
  try {
    await transaction();
  } catch (err) {
    if (err instanceof GuardError) return { success: false, error: err.message };
    throw err; // genuinely unexpected — let Next's own redaction handle it
  }
  revalidateManagerPaths();
  return { success: true };
}

export async function suspendUser(input: ModerateUserInput): Promise<ActionResult> {
  const manager = await requireRole("MANAGER");
  const parsed = moderateUserSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid request." };
  const { userId, reason } = parsed.data;

  if (userId === manager.id) return { success: false, error: "Cannot modify your own account." };

  return runGuarded(async () => {
    await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id: userId } });
      if (!target) throw new GuardError("User not found.");
      if (target.role === "MANAGER") {
        throw new GuardError("Cannot modify another manager.");
      }
      if (target.status !== "ACTIVE") {
        throw new GuardError("Only an active account can be suspended.");
      }

      await tx.user.update({ where: { id: userId }, data: { status: "SUSPENDED" } });

      // Cascades at the application level (CLAUDE.md → Manager actions): only
      // currently-ACTIVE listings flip, so an asset a manager already removed
      // directly is left alone.
      if (target.role === "SELLER") {
        await tx.asset.updateMany({
          where: { sellerId: userId, listingStatus: "ACTIVE" },
          data: { listingStatus: "SUSPENDED" },
        });
      }

      // CLAUDE.md → Auth: suspend/remove deletes the session so it dies
      // immediately rather than waiting out the 60s cookie cache.
      await tx.session.deleteMany({ where: { userId } });

      await logAction(tx, {
        actorId: manager.id,
        action: "SUSPEND_USER",
        targetType: "USER",
        targetId: userId,
        reason,
      });
    });
  });
}

export async function removeUser(input: ModerateUserInput): Promise<ActionResult> {
  const manager = await requireRole("MANAGER");
  const parsed = moderateUserSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid request." };
  const { userId, reason } = parsed.data;

  if (userId === manager.id) return { success: false, error: "Cannot modify your own account." };

  return runGuarded(async () => {
    await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id: userId } });
      if (!target) throw new GuardError("User not found.");
      if (target.role === "MANAGER") {
        throw new GuardError("Cannot modify another manager.");
      }
      if (target.status === "REMOVED") {
        throw new GuardError("This account has already been removed.");
      }

      await tx.user.update({ where: { id: userId }, data: { status: "REMOVED" } });

      // Remove is terminal, so it catches both ACTIVE and SUSPENDED listings.
      if (target.role === "SELLER") {
        await tx.asset.updateMany({
          where: { sellerId: userId, listingStatus: { not: "REMOVED" } },
          data: { listingStatus: "REMOVED" },
        });
      }

      await tx.session.deleteMany({ where: { userId } });

      await logAction(tx, {
        actorId: manager.id,
        action: "REMOVE_USER",
        targetType: "USER",
        targetId: userId,
        reason,
      });
    });
  });
}

export async function reactivateUser(input: ModerateUserInput): Promise<ActionResult> {
  const manager = await requireRole("MANAGER");
  const parsed = moderateUserSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid request." };
  const { userId, reason } = parsed.data;

  if (userId === manager.id) return { success: false, error: "Cannot modify your own account." };

  return runGuarded(async () => {
    await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id: userId } });
      if (!target) throw new GuardError("User not found.");
      if (target.role === "MANAGER") {
        throw new GuardError("Cannot modify another manager.");
      }
      // REMOVED is a soft delete and not reversible from the UI (CLAUDE.md) —
      // only a SUSPENDED account can come back.
      if (target.status !== "SUSPENDED") {
        throw new GuardError("Only a suspended account can be reactivated.");
      }

      await tx.user.update({ where: { id: userId }, data: { status: "ACTIVE" } });

      if (target.role === "SELLER") {
        await restoreCascadedListings(tx, userId);
      }

      await logAction(tx, {
        actorId: manager.id,
        action: "REACTIVATE_USER",
        targetType: "USER",
        targetId: userId,
        reason,
      });
    });
  });
}
