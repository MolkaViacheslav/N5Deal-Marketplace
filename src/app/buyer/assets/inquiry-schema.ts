import { z } from "zod";

export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 1000;

export const inquirySchema = z.object({
  assetId: z.string().min(1),
  message: z
    .string()
    .trim()
    .min(MESSAGE_MIN, `Say a little more — at least ${MESSAGE_MIN} characters.`)
    .max(MESSAGE_MAX, `Keep it under ${MESSAGE_MAX} characters.`),
});

// Note what is absent: no recipient. `toUserId` is derived from the asset on
// the server (see actions.ts) precisely so it can never be supplied here.
export type InquiryValues = z.infer<typeof inquirySchema>;
