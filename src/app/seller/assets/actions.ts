"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { assetSchema, sanitizeByCategory } from "@/app/seller/assets/schema";

/**
 * Listing mutations for the seller.
 *
 * Every action opens with `requireRole("SELLER")`. The `/seller` layout already
 * guards the pages, but a Server Action is its own HTTP endpoint and can be
 * invoked without that layout ever rendering — layer 3 of the access-control
 * chain in CLAUDE.md → Conventions.
 *
 * On top of the role check, `updateAsset` and `deleteAsset` re-read the row and
 * compare `sellerId` against the session before touching anything. The route
 * only ever offers a seller their own listings, but the id in the payload is
 * whatever the caller sent.
 *
 * Failures are returned, not thrown (`lib/action-result.ts`): Next redacts a
 * thrown Server Action message in a production build.
 */

const idSchema = z.object({ id: z.string().min(1) });

// Nested rather than flat (`{ id, ...values }`): `z.object({ id }).and(union)`
// produces an intersection, and an intersection does not strip unknown keys the
// way the union's own branches do — the strip is what stops a STAKE submission
// carrying a leftover `regulatoryBody` into the parsed output.
const updateAssetSchema = z.object({
  id: z.string().min(1),
  values: assetSchema,
});

/**
 * Deliberately the same message for "no such listing" and "not yours".
 *
 * Telling the two apart turns the error into an oracle: a seller could probe ids
 * and learn which listings exist on the platform. The seller never sees this
 * text through normal use of the UI anyway.
 */
const NOT_FOUND = "That listing could not be found.";

function firstIssue(error: z.ZodError, fallback: string): string {
  return error.issues[0]?.message ?? fallback;
}

/**
 * Every surface a listing appears on. A listing is visible to buyers, countable
 * by the manager and editable by its seller, so a write to it staleness-busts
 * three sections at once — without this the RSC cache serves the old list
 * (CLAUDE.md pitfall 8).
 */
function revalidateListingPaths(assetId?: string) {
  revalidatePath("/seller/assets");
  revalidatePath("/buyer/assets");
  revalidatePath("/manager/assets");
  revalidatePath("/manager");
  if (assetId) revalidatePath(`/buyer/assets/${assetId}`);
}

/**
 * Read a listing for writing, and prove it belongs to the caller.
 *
 * Returns the row's moderation state alongside, because what a seller may do
 * next depends on it: a REMOVED listing is terminal.
 */
async function findOwnAsset(id: string, sellerId: string) {
  const asset = await prisma.asset.findUnique({
    where: { id },
    select: { id: true, sellerId: true, listingStatus: true },
  });

  // A listing owned by somebody else is treated as if it did not exist.
  if (!asset || asset.sellerId !== sellerId) return null;
  return asset;
}

export async function createAsset(input: unknown): Promise<ActionResult> {
  const user = await requireRole("SELLER");

  const parsed = assetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: firstIssue(parsed.error, "That listing could not be saved."),
    };
  }

  // `sellerId` comes from the session and is never read off the payload, so
  // there is no shape of input that publishes a listing under someone else's
  // name. `listingStatus` is left to its schema default of ACTIVE.
  await prisma.asset.create({
    data: { sellerId: user.id, ...sanitizeByCategory(parsed.data) },
  });

  revalidateListingPaths();

  return { success: true };
}

export async function updateAsset(input: unknown): Promise<ActionResult> {
  const user = await requireRole("SELLER");

  const parsed = updateAssetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: firstIssue(parsed.error, "Those changes could not be saved."),
    };
  }

  const { id, values } = parsed.data;

  const existing = await findOwnAsset(id, user.id);
  if (!existing) return { success: false, error: NOT_FOUND };

  if (existing.listingStatus === "REMOVED") {
    return {
      success: false,
      error: "This listing has been removed and can no longer be edited.",
    };
  }

  // `sanitizeByCategory` returns every column a seller controls, with the other
  // categories' fields explicitly null — so a listing that was a LICENSE and is
  // now a STAKE does not keep its old `regulatoryBody` in the database.
  //
  // It carries no `listingStatus`, which is the point: a listing a manager
  // suspended stays suspended through any number of edits.
  await prisma.asset.update({
    where: { id },
    data: sanitizeByCategory(values),
  });

  revalidateListingPaths(id);

  return { success: true };
}

/**
 * Withdraw a listing.
 *
 * A soft delete (`listingStatus: "REMOVED"`), matching what REMOVED already
 * means everywhere else in the app (CLAUDE.md → Manager actions): hidden
 * everywhere, data retained. `Inquiry.asset` is an optional relation with no
 * explicit `onDelete`, so Prisma defaults to `SetNull` — a hard delete would
 * quietly rewrite history, turning a buyer's sent message into "General enquiry
 * — no listing" months after they wrote it about a specific asset.
 *
 * No `AuditLog` row: `lib/audit.ts` records *manager moderation*, and a
 * REMOVE_ASSET entry with a seller as its actor would put a seller's own
 * housekeeping into the moderation table on /manager.
 */
export async function deleteAsset(input: unknown): Promise<ActionResult> {
  const user = await requireRole("SELLER");

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid request." };

  const existing = await findOwnAsset(parsed.data.id, user.id);
  if (!existing) return { success: false, error: NOT_FOUND };

  if (existing.listingStatus === "REMOVED") {
    return { success: false, error: "This listing has already been withdrawn." };
  }

  await prisma.asset.update({
    where: { id: existing.id },
    data: { listingStatus: "REMOVED" },
  });

  revalidateListingPaths(existing.id);

  return { success: true };
}
