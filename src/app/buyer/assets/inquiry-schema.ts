import { z } from "zod";

import { messageField } from "@/lib/inquiry-message";

// Re-exported so the contact dialog can render the character counter without
// importing from two modules to describe one field.
export { MESSAGE_MIN, MESSAGE_MAX } from "@/lib/inquiry-message";

export const inquirySchema = z.object({
  assetId: z.string().min(1),
  message: messageField,
});

// Note what is absent: no recipient. `toUserId` is derived from the asset on
// the server (see actions.ts) precisely so it can never be supplied here.
export type InquiryValues = z.infer<typeof inquirySchema>;
