"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { inquirySchema } from "@/app/buyer/assets/inquiry-schema";

/**
 * Send a buyer's message to the seller behind a listing.
 *
 * Takes one typed object rather than positional arguments, per CLAUDE.md ->
 * Conventions: react-hook-form already produces exactly this shape on the
 * client, and the action re-validates it with the very same Zod schema here.
 *
 * Two things are deliberately not taken from the client:
 *
 * - `fromUserId` comes from the session, so a buyer cannot write an inquiry
 *   attributed to somebody else;
 * - `toUserId` is read off the asset, so the payload cannot address a message
 *   to an arbitrary user id. The client sends *which listing*, never *which
 *   person*.
 *
 * The asset is re-fetched with the same visibility rule the browse and detail
 * pages use, rather than trusted because the caller was on the page: the
 * listing may have been moderated away since that page rendered.
 */
export async function createInquiry(input: unknown): Promise<ActionResult> {
  const user = await requireRole("BUYER");

  const parsed = inquirySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "That message could not be sent.",
    };
  }

  const asset = await prisma.asset.findFirst({
    where: {
      id: parsed.data.assetId,
      listingStatus: "ACTIVE",
      seller: { status: "ACTIVE" },
    },
    select: { id: true, sellerId: true },
  });

  if (!asset) {
    return { success: false, error: "This listing is no longer available." };
  }

  // Can't happen while roles are exclusive, but the DB has no constraint
  // preventing a self-addressed inquiry and the Inquiry lists assume there are
  // two distinct parties.
  if (asset.sellerId === user.id) {
    return { success: false, error: "You cannot send an inquiry to yourself." };
  }

  await prisma.inquiry.create({
    data: {
      fromUserId: user.id,
      toUserId: asset.sellerId,
      assetId: asset.id,
      message: parsed.data.message,
    },
  });

  revalidatePath("/buyer/inquiries");
  // It lands in the seller's Received tab the moment this succeeds — the
  // mirror of what `contactBuyer` in app/seller/buyers/actions.ts already
  // does for the other direction.
  revalidatePath("/seller/inquiries");

  return { success: true };
}
