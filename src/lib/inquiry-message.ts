// Everything about the *text* of an inquiry, in one place.
//
// It lived in two: `app/buyer/assets/inquiry-schema.ts` and
// `app/seller/buyers/inquiry-schema.ts` each carried their own bounds, and the
// two inquiry pages each carried their own preview helper. Restating them was
// deliberate at the time — a `seller/buyers` module reaching into `buyer/assets`
// would couple two role folders that are otherwise independent — but the copies
// had already drifted: the seller's preview cut by code point, the buyer's by
// UTF-16 code unit, so an emoji at the cut turned into "�" on one screen and
// not the other.
//
// `lib/` is the answer both role folders can share without either owning it.

import { z } from "zod";

export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 1000;

/** The message field itself, error messages included — the two inquiry schemas
 *  differ in *whom* they name (a listing vs a buyer), never in this. */
export const messageField = z
  .string()
  .trim()
  .min(MESSAGE_MIN, `Say a little more — at least ${MESSAGE_MIN} characters.`)
  .max(MESSAGE_MAX, `Keep it under ${MESSAGE_MAX} characters.`);

// Enough to tell two messages apart in a list without turning each row into a
// wall of text.
export const PREVIEW_LENGTH = 100;

/**
 * Cut by code point, not by `slice()`. A JS string indexes UTF-16 code units,
 * so slicing at a fixed offset can land in the middle of a surrogate pair and
 * leave a lone half behind. `Array.from` iterates code points, so the cut
 * always falls between whole characters.
 *
 * Applied on the server before the row is handed to a card, so the untruncated
 * message never crosses the RSC boundary for something that only ever shows a
 * preview.
 */
export function previewMessage(message: string): string {
  const chars = Array.from(message);

  return chars.length <= PREVIEW_LENGTH
    ? message
    : `${chars.slice(0, PREVIEW_LENGTH).join("").trimEnd()}…`;
}
