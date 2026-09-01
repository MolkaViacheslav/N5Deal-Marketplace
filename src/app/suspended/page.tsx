import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth-guard";
import { homeFor } from "@/lib/routes";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Account suspended" };

export const dynamic = "force-dynamic";

/**
 * Where `requireRole()` sends anyone whose status is not ACTIVE.
 *
 * Deliberately outside the role sections and outside `proxy.ts`'s matcher: a
 * suspended user must be able to land here without being bounced back into a
 * guard that would only redirect them here again.
 */
export default async function SuspendedPage() {
  const user = await getSessionUser();

  // Signed out entirely — nothing to explain.
  if (!user) redirect("/sign-in");
  // Status was restored (or they were never suspended): don't strand them.
  if (user.status === "ACTIVE") redirect(homeFor(user.role));

  const removed = user.status === "REMOVED";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {removed ? "Account removed" : "Account suspended"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            {removed
              ? "This account has been removed by a platform manager and can no longer access the marketplace."
              : "This account has been suspended by a platform manager. Access is paused until it is reinstated."}
          </p>
          <p>
            Signed in as{" "}
            <span className="font-medium text-foreground">{user.email}</span>.
          </p>
          <p>
            If you believe this is a mistake, contact the platform team at{" "}
            <span className="font-medium text-foreground">
              support@n5deal.example
            </span>
            .
          </p>
          <div className="pt-2">
            <SignOutButton />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
