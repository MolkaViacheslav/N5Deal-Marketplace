import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";

import {
  ProfileForm,
  type ProfileFormDefaults,
} from "@/components/buyer/profile-form";
import { PROFILE_FORM_ID } from "@/app/buyer/profile/form-id";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "My profile" };

export const dynamic = "force-dynamic";

const EMPTY_PROFILE: ProfileFormDefaults = {
  industries: [],
  regions: [],
  budgetMin: null,
  budgetMax: null,
  description: null,
};

export default async function BuyerProfilePage() {
  // The layout has already established this is an ACTIVE buyer; this call is
  // deduped by `cache()` inside `getSessionUser` and just gets us the id.
  const user = await requireRole("BUYER");

  const profile = await prisma.buyerProfile.findUnique({
    where: { userId: user.id },
    select: {
      industries: true,
      regions: true,
      budgetMin: true,
      budgetMax: true,
      description: true,
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">My profile</h1>
        <p className="text-sm text-muted-foreground">
          {profile
            ? "Keep this current — sellers use it to decide who to approach."
            : "Tell sellers what you are looking for. You can change any of this later."}
        </p>
      </div>

      {/* Shown only on a first visit. This is the same no-profile fallback
          CLAUDE.md describes for Smart Matching: without a profile there is
          nothing to score listings against, so browse shows no match badges
          and no recommendations until this is filled in. */}
      {!profile && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-start gap-3">
            <Sparkles
              className="mt-0.5 size-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <p className="text-sm">
              Complete your profile to see match scores and recommendations.{" "}
              <Link
                href={`#${PROFILE_FORM_ID}`}
                className="font-medium text-primary underline underline-offset-4"
              >
                Start with your industries and regions below
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      )}

      {/* One screen for both create and edit: the action upserts, so the
          distinction never reaches the user beyond the button label. */}
      <ProfileForm
        defaults={profile ?? EMPTY_PROFILE}
        hasProfile={profile !== null}
      />
    </div>
  );
}
