// Catch-all route for Better Auth.
//
// [...all] captures every path under /api/auth/* (sign-in, sign-out,
// get-session, ...) and hands it to Better Auth's handler. This is the whole
// HTTP layer of authentication — it is also the ONLY route handler in the app
// besides /api/ai/parse-query; everything else is a Server Action.

import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
