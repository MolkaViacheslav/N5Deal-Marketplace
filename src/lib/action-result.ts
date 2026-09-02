/**
 * The return shape every Server Action in the app uses.
 *
 * Failures come back as a value, not as a thrown error.
 *
 * "Throw with a user-facing message" does not survive a production build:
 * Next redacts errors escaping a Server Action before they reach the browser.
 * Verified against `next build && next start` — a deliberate
 * `throw new Error("SENTINEL_USER_FACING_MESSAGE")` reached the client as an
 * HTTP 500 plus minified React error #441, with the message itself nowhere in
 * the payload. A thrown message is therefore readable only in `next dev`,
 * which is exactly where it is least needed.
 *
 * Lives in `lib/` rather than next to the first action that needed it: Phases
 * 5–6 add seller and manager actions, and four copies of a two-line union is
 * how the error branch ends up shaped differently on one of them.
 */
export type ActionResult = { success: true } | { success: false; error: string };
