// Pure routing helpers, deliberately free of any server-only import.
//
// These live apart from `auth-guard.ts` because the sign-in form (a Client
// Component) needs `homeFor()` too, and `auth-guard.ts` pulls in `@/lib/auth`
// → Prisma. Importing that from the client would drag the database driver into
// the browser bundle.

import type { Role } from "@/generated/prisma/enums";

// Where each role lands after signing in, and where a role that wandered into
// someone else's section gets sent back to.
//
// A Map, not a plain object: every current caller passes a value straight
// from the DB `Role` enum, so this is belt-and-suspenders rather than a fix
// for an active bug — but `homeFor()` takes a bare `string`, not `Role` (see
// below), and a `Record`/object literal keyed by an attacker-influenced
// string resolves inherited names like "__proto__" or "toString" against
// `Object.prototype` instead of returning `undefined`. A Map has no
// prototype chain to collide with.
const HOME_BY_ROLE = new Map<Role, string>([
  ["BUYER", "/buyer/assets"],
  ["SELLER", "/seller/assets"],
  ["MANAGER", "/manager"],
]);

/**
 * Accepts a loose `string | null | undefined` rather than `Role` on purpose:
 * Better Auth types `additionalFields` with `required: false` as optional, so
 * `session.user.role` arrives nullable even though the column is non-nullable
 * with a default. Anything unrecognised falls back to the public landing page.
 */
export function homeFor(role: string | null | undefined): string {
  if (!role) return "/";
  return HOME_BY_ROLE.get(role as Role) ?? "/";
}

// Arbitrary, never-resolvable origin used only to detect whether `next`
// escapes it. ".invalid" is the TLD IANA reserves exactly for this.
const NEXT_PROBE_ORIGIN = "http://n5deal.invalid";

/**
 * Sanitise a `next=` value before redirecting to it.
 *
 * `src/proxy.ts` only ever writes a same-origin path here, but the parameter
 * is attacker-controllable in a crafted link, and an unchecked redirect
 * target is an open redirect.
 *
 * This used to be a string-prefix check (reject values starting with "//" or
 * "/\\"). That is not sufficient: `new URL()` — and every real browser,
 * since both implement the WHATWG URL Standard — strips ASCII tab and
 * newline out of the input *before* parsing it. So `"/\t/evil.com"` passes
 * every prefix check (starts with a single "/", not "//") while resolving to
 * `http://evil.com/`, because after the tab is stripped it collapses to
 * `"//evil.com"` — a protocol-relative reference. Confirmed against a real
 * Chromium instance: visiting `/sign-in?next=%2F%09%2Fevil.com` while signed
 * in actually navigates to evil.com.
 *
 * The fix is to let the URL parser itself resolve `next` against a fixed,
 * unroutable origin and check whether the *origin* moved — that is the one
 * invariant no amount of tab/backslash/encoding trickery can fake, because
 * it is the same algorithm every consumer (the browser, Next's redirect)
 * uses to resolve the value in the first place.
 */
export function safeNextPath(next: string | undefined | null): string | null {
  if (!next) return null;

  let resolved: URL;
  try {
    resolved = new URL(next, NEXT_PROBE_ORIGIN);
  } catch {
    return null;
  }
  if (resolved.origin !== NEXT_PROBE_ORIGIN) return null;

  // Rebuilt from the parsed URL, not returned verbatim — this also discards
  // whatever the parser normalised away (stray tabs, redundant slashes, ...)
  // rather than forwarding it into a redirect Location header unexamined.
  return `${resolved.pathname}${resolved.search}${resolved.hash}` || "/";
}
