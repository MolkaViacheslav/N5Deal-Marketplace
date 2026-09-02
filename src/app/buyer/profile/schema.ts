import { z } from "zod";

import { INDUSTRIES, REGIONS } from "@/lib/taxonomy";

/**
 * Optional whole-EUR amount coming off a text input.
 *
 * The `z.preprocess` wrapper is the point: `z.coerce.number().optional()` alone
 * turns an untouched field's `""` into `0` (CLAUDE.md pitfall 7), so "no
 * maximum" would silently become "maximum €0" and the buyer would match
 * nothing. Stripping the empty value to `undefined` *before* coercion is what
 * keeps optional actually optional.
 *
 * Accepting an already-parsed number as well as a string is what lets the
 * client submit its parsed values to a Server Action that re-validates with
 * this same schema (CLAUDE.md → Conventions).
 */
const optionalInt = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce
    .number()
    .int("Enter a whole number of euros")
    .positive("Enter an amount above zero")
    // Postgres `Int` is 32-bit; a larger figure would throw at the driver
    // rather than surfacing as a field error the buyer can act on.
    .max(2_147_483_647, "That budget is unrealistically large")
    .optional()
);

export const buyerProfileSchema = z
  .object({
    // Constrained to the shared vocabulary in `src/lib/taxonomy.ts`, which is
    // also what the seed, the browse filter bar and the Phase 7 matching rules
    // read. A profile can therefore never hold an industry or region that no
    // listing can be expressed in.
    industries: z.array(z.enum(INDUSTRIES)).max(INDUSTRIES.length).default([]),
    regions: z.array(z.enum(REGIONS)).max(REGIONS.length).default([]),
    budgetMin: optionalInt,
    budgetMax: optionalInt,
    description: z.string().trim().max(1000).default(""),
  })
  .refine(
    (data) =>
      data.budgetMin === undefined ||
      data.budgetMax === undefined ||
      data.budgetMin <= data.budgetMax,
    {
      message: "Minimum budget cannot exceed the maximum",
      path: ["budgetMax"],
    }
  )
  // A profile with nothing selected is not a profile: matching scores country
  // against `regions` and industry against `industries`, and a missing
  // criterion scores 0 rather than acting as a wildcard (CLAUDE.md → Smart
  // Matching). Saving an empty one would replace the honest "complete your
  // profile" prompt with a wall of 0% badges — a worse answer than no answer.
  .refine((data) => data.industries.length > 0 || data.regions.length > 0, {
    message: "Choose at least one industry or region so listings can be matched",
    path: ["industries"],
  });

/**
 * What the form holds. `z.preprocess` types its own input as `unknown`, so the
 * two budget fields are loosely typed here by construction — the trade for
 * using the preprocess pattern the rest of the codebase uses.
 */
export type BuyerProfileInput = z.input<typeof buyerProfileSchema>;

/** What the action receives after parsing — budgets are numbers or absent. */
export type BuyerProfileValues = z.output<typeof buyerProfileSchema>;
