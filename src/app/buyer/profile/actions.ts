"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { buyerProfileSchema } from "@/app/buyer/profile/schema";

/**
 * Create or update the caller's buyer profile.
 *
 * `requireRole` runs again here even though `/buyer` layout already guards the
 * page: a Server Action is its own HTTP endpoint and can be invoked without
 * that layout ever rendering (CLAUDE.md → Conventions, layer 3).
 *
 * The profile is keyed off the *session* user id, never off anything in the
 * payload, so there is no shape of input that writes to someone else's row.
 */
export async function upsertBuyerProfile(
  input: unknown
): Promise<ActionResult> {
  const user = await requireRole("BUYER");

  const parsed = buyerProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ??
        "Those details could not be saved. Check the form and try again.",
    };
  }

  const { industries, regions, budgetMin, budgetMax, description } =
    parsed.data;

  // `null`, not `undefined`: this is an upsert, and `undefined` in a Prisma
  // update means "leave this column alone". Clearing a budget or a description
  // has to write an actual null or the old value survives the save.
  const data = {
    industries,
    regions,
    budgetMin: budgetMin ?? null,
    budgetMax: budgetMax ?? null,
    description: description === "" ? null : description,
  };

  await prisma.buyerProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });

  revalidatePath("/buyer/profile");
  // The profile drives match scores on browse (Phase 7), so that list is stale
  // the moment this succeeds.
  revalidatePath("/buyer/assets");

  return { success: true };
}
