/**
 * Anchor id shared by the page's first-visit banner and the form it points at.
 *
 * Deliberately NOT exported from `profile-form.tsx`. That file is `"use
 * client"`, and a Server Component importing a non-component value out of a
 * client module gets a client-reference stub rather than the value — the
 * banner's `href={`#${PROFILE_FORM_ID}`}` stringified that stub into the URL
 * and produced a dead link. It compiled, linted and built cleanly; only
 * opening the page in a browser showed it.
 */
export const PROFILE_FORM_ID = "profile-form";
