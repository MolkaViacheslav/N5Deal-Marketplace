import { z } from "zod";

import { messageField } from "@/lib/inquiry-message";

// Re-exported so the contact dialog can render the character counter without
// importing from two modules to describe one field.
export { MESSAGE_MIN, MESSAGE_MAX } from "@/lib/inquiry-message";

export const contactBuyerSchema = z.object({
  buyerId: z.string().min(1),
  message: messageField,
});

// Note the difference from the buyer's twin, which names a *listing* and lets
// the server derive the person. Here the person is the subject of the flow —
// a seller approaches a buyer off the back of their profile — so `buyerId` is
// the payload, and the server's job is to prove that id is an ACTIVE BUYER
// rather than any user the caller cared to name.
export type ContactBuyerValues = z.infer<typeof contactBuyerSchema>;
