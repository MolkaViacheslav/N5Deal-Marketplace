// Layer 1 of 3 in the access-control chain (see CLAUDE.md → Conventions).
//
// Next.js 16 renamed `middleware.ts` to `proxy.ts`; the semantics are
// unchanged, including the Edge runtime.
//
// This ONLY checks that a session cookie is present. It cannot do more:
// `auth.api.getSession()` needs Prisma, Prisma needs Node APIs, and this file
// runs on the Edge runtime where those don't exist.
//
// So this is a cheap redirect for logged-out visitors, NOT a security
// boundary — a forged cookie gets past it (the docs call this an "optimistic
// check"). Role and status are enforced server-side by `requireRole()` in
// every role layout (layer 2) and again inside every Server Action (layer 3),
// because a Server Action can be invoked directly without ever rendering the
// page whose layout guards it.

import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const signInUrl = new URL("/sign-in", request.url);
    // Preserve where they were headed so sign-in can bounce them back.
    signInUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Only the authenticated areas. Everything else (landing, /sign-in,
  // /api/auth/*, static assets) is left alone.
  matcher: ["/buyer/:path*", "/seller/:path*", "/manager/:path*"],
};
