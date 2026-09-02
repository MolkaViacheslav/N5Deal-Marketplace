import { z } from "zod";

// The same bounds as the buyer's `app/buyer/assets/inquiry-schema.ts`. Restated
// rather than imported: a `seller/buyers` module reaching into `buyer/assets`
// would couple two role folders that are otherwise independent. The two schemas
// are near-twins and belong in one shared module — a consistency pass after this
// phase merges, exactly like the one that unified `ActionResult` and the
// category badge after Phases 3/4/6.
export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 1000;

export const contactBuyerSchema = z.object({
  buyerId: z.string().min(1),
  message: z
    .string()
    .trim()
    .min(MESSAGE_MIN, `Say a little more — at least ${MESSAGE_MIN} characters.`)
    .max(MESSAGE_MAX, `Keep it under ${MESSAGE_MAX} characters.`),
});

// Note the difference from the buyer's twin, which names a *listing* and lets
// the server derive the person. Here the person is the subject of the flow —
// a seller approaches a buyer off the back of their profile — so `buyerId` is
// the payload, and the server's job is to prove that id is an ACTIVE BUYER
// rather than any user the caller cared to name.
export type ContactBuyerValues = z.infer<typeof contactBuyerSchema>;
