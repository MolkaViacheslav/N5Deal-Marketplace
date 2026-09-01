// Layers 2 and 3 of the access-control chain (see CLAUDE.md → Conventions).
//
// `src/proxy.ts` only checks that a session cookie exists — it runs on the Edge
// and cannot reach Prisma, and a forged cookie sails straight past it. Every
// real decision about *who* the caller is happens here, on the server.
//
// Call `requireRole()` in the role layout AND again inside every Server Action.
// The layout guard alone is not enough: a Server Action is an HTTP endpoint in
// its own right and can be invoked without ever rendering the page it sits
// behind.
//
// Server-only: this imports `@/lib/auth`, which pulls in Prisma. Client
// Components that need `homeFor()` import it from `@/lib/routes` instead.

import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { homeFor } from "@/lib/routes";
import type { Role } from "@/generated/prisma/enums";

/**
 * The session user, or `null` when signed out. Never redirects — use this for
 * pages that render differently for guests (the landing page, /sign-in).
 */
export async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

/**
 * Any signed-in, ACTIVE user. Use where a route is shared across roles.
 */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (user.status !== "ACTIVE") redirect("/suspended");
  return user;
}

/**
 * A signed-in, ACTIVE user holding exactly `role`.
 *
 * Order matters: status is checked before role, so a suspended Buyer lands on
 * /suspended rather than being bounced around inside their own section.
 */
export async function requireRole(role: Role) {
  const user = await requireUser();
  if (user.role !== role) redirect(homeFor(user.role));
  return user;
}
