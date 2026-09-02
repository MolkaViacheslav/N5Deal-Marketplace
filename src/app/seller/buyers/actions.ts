"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { contactBuyerSchema } from "@/app/seller/buyers/inquiry-schema";

/**
 * Send a seller's approach to a buyer.
 *
 * The mirror of `app/buyer/assets/actions.ts` → `createInquiry`, with one
 * structural difference. The buyer flow sends *which listing* and lets the
 * server read the recipient off it, so the payload can never address an
 * arbitrary user. Here the recipient is the whole point — a seller approaches a
 * buyer because of their profile — so the id is in the payload, and the guard
 * moves to re-proving what that id is: an ACTIVE BUYER, re-read here rather than
 * trusted because the caller was on the page. A buyer may have been suspended
 * since that page rendered.
 *
 * `fromUserId` still comes from the session, so a seller cannot write an inquiry
 * attributed to somebody else.
 */
export async function contactBuyer(input: unknown): Promise<ActionResult> {
  const user = await requireRole("SELLER");

  const parsed = contactBuyerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "That message could not be sent.",
    };
  }

  const buyer = await prisma.user.findFirst({
    // Exactly the visibility rule /seller/buyers applies, restated at the
    // mutation: no role, no status, no other user can be addressed here.
    where: { id: parsed.data.buyerId, role: "BUYER", status: "ACTIVE" },
    select: { id: true },
  });

  if (!buyer) {
    return { success: false, error: "This buyer is no longer available." };
  }

  // Can't happen while roles are exclusive, but the database has no constraint
  // against a self-addressed inquiry and both Inquiry lists assume two distinct
  // parties.
  if (buyer.id === user.id) {
    return { success: false, error: "You cannot send an inquiry to yourself." };
  }

  await prisma.inquiry.create({
    data: {
      fromUserId: user.id,
      toUserId: buyer.id,
      // Not missing data — a genuine state. `Inquiry.assetId` is nullable
      // precisely because a seller approaches a buyer off the back of their
      // profile rather than about one listing, and both roles' inquiry cards
      // label it "General enquiry — no listing" rather than leaving a blank.
      assetId: null,
      message: parsed.data.message,
    },
  });

  revalidatePath("/seller/inquiries");
  // It lands in the buyer's Received tab the moment this succeeds.
  revalidatePath("/buyer/inquiries");

  return { success: true };
}
