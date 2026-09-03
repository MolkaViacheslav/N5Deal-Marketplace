import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth-guard";
import { homeFor, safeNextPath } from "@/lib/routes";
import { SignInForm } from "@/components/auth/sign-in-form";
import { BrandMark } from "@/components/layout/brand-mark";

export const metadata: Metadata = { title: "Sign in" };

// Reads the session, so it must never be prerendered (CLAUDE.md pitfall 5).
export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(typeof next === "string" ? next : null);

  // Already signed in: don't show a login form, send them where they were
  // going. A suspended user is deliberately allowed no further than /suspended.
  const user = await getSessionUser();
  if (user) {
    if (user.status !== "ACTIVE") redirect("/suspended");
    redirect(nextPath ?? homeFor(user.role));
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-xl font-semibold tracking-tight">
            <BrandMark />
            <span className="text-muted-foreground">Deal</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Marketplace for M&amp;A opportunities and financial assets
          </p>
        </div>

        <SignInForm nextPath={nextPath} />
      </div>
    </div>
  );
}
