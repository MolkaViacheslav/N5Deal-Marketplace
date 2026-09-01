// Better Auth — browser side. Mirrors src/lib/auth.ts but holds no secrets:
// it just calls /api/auth/* and exposes helpers.
//
// Import this from "use client" components only. The server instance
// (src/lib/auth.ts) pulls in Prisma and must never reach the browser bundle.

import { createAuthClient } from "better-auth/react";
import type { auth } from "@/lib/auth";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  // Without this the client-side `session.user` type is missing role/status/
  // companyName, even though the server sends them.
  plugins: [inferAdditionalFields<typeof auth>()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
