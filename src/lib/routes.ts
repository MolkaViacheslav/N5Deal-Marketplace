// Pure routing helpers, deliberately free of any server-only import.
//
// These live apart from `auth-guard.ts` because the sign-in form (a Client
// Component) needs `homeFor()` too, and `auth-guard.ts` pulls in `@/lib/auth`
// → Prisma. Importing that from the client would drag the database driver into
// the browser bundle.

import type { Role } from "@/generated/prisma/enums";

// Where each role lands after signing in, and where a role that wandered into
// someone else's section gets sent back to.
const HOME_BY_ROLE: Record<Role, string> = {
  BUYER: "/buyer/assets",
  SELLER: "/seller/assets",
  MANAGER: "/manager",
};

/**
 * Accepts a loose `string | null | undefined` rather than `Role` on purpose:
 * Better Auth types `additionalFields` with `required: false` as optional, so
 * `session.user.role` arrives nullable even though the column is non-nullable
 * with a default. Anything unrecognised falls back to the public landing page.
 */
export function homeFor(role: string | null | undefined): string {
  if (!role) return "/";
  return HOME_BY_ROLE[role as Role] ?? "/";
}

/**
 * Sanitise a `next=` value before redirecting to it.
 *
 * `src/proxy.ts` only ever writes a same-origin path here, but the parameter is
 * attacker-controllable in a crafted link, and an unchecked redirect target is
 * an open redirect. Anything that is not a plain absolute path is discarded so
 * the caller can fall back to the role's own home.
 *
 * Rejects: absolute URLs ("https://evil.test"), protocol-relative ("//evil"),
 * and the backslash variants some browsers normalise into "//".
 */
export function safeNextPath(next: string | undefined | null): string | null {
  if (!next) return null;
  if (!next.startsWith("/")) return null;
  if (next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}
