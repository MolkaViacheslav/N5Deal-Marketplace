// Better Auth — server configuration. The single source of truth for auth.
//
// Better Auth derives its own HTTP endpoints from this config
// (/api/auth/sign-in, /sign-out, /get-session, ...); src/app/api/auth/[...all]
// just proxies them.
//
// Session-based (Better Auth's default), not JWT: sign-in writes a Session row
// and hands the browser an httpOnly cookie holding a random token, not user
// data. That means a session can be revoked instantly by deleting the row —
// which is exactly what the Platform Manager's Suspend/Remove actions rely on.
//
// The cost is a DB lookup per request, which `session.cookieCache` below
// removes for most of them.

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,

  emailAndPassword: {
    enabled: true,
    // No mail provider in a prototype, and seed users are the only accounts.
    requireEmailVerification: false,
    minPasswordLength: 8,
    // "No self-registration — 3 seed users only" is a declared scope cut, so
    // the endpoint has to actually be closed: with `enabled: true` alone,
    // POST /api/auth/sign-up/email happily creates BUYER/ACTIVE accounts on
    // the public demo URL.
    //
    // This also blocks `auth.api.signUpEmail()`, which the seed used to call.
    // The seed now goes through `auth.$context.internalAdapter` instead —
    // the same code path the endpoint uses internally, so password hashing,
    // ID generation and field mapping stay identical.
    disableSignUp: true,
  },

  // These three columns exist on the Prisma User model, but Better Auth only
  // puts them on `session.user` if they are ALSO declared here. Miss this and
  // `requireRole()` silently reads undefined.
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "BUYER",
        input: false, // never settable from a sign-up payload
      },
      status: {
        type: "string",
        required: false,
        defaultValue: "ACTIVE",
        input: false,
      },
      companyName: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh once a day
    // Signed copy of the session in the cookie, so every guarded page render
    // doesn't hit Postgres.
    //
    // TRADE-OFF: the cache also holds `status`, so a Manager's Suspend takes
    // up to maxAge to bite on an ALREADY-open session. Better Auth's default
    // (5 min) would read as a broken demo, so we cut it to 60s and the
    // suspend/remove actions additionally delete that user's Session rows —
    // which kills the session the moment the cookie cache expires.
    // A fresh sign-in is blocked immediately either way.
    cookieCache: {
      enabled: true,
      maxAge: 60,
    },
  },
});
