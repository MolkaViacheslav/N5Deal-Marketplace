import { z } from "zod";

import type { AssetCategory, BusinessStatus } from "@/generated/prisma/enums";

/**
 * Postgres `Int` is 32-bit. Without this bound a seller typing `9999999999`
 * into Asking price passes Zod and blows up at the pg driver instead — an
 * uncaught 500 rather than a field error they can act on. CLAUDE.md's snippet
 * of this schema omits the cap; `app/buyer/profile/schema.ts` already carries
 * it on its budget fields for exactly this reason, so the two agree.
 */
const INT4_MAX = 2_147_483_647;

/**
 * Optional whole number coming off a text input.
 *
 * `z.preprocess` is the load-bearing part: `z.coerce.number().optional()` alone
 * turns an untouched field's `""` into `0` (CLAUDE.md pitfall 7), so a listing
 * with no year founded would be saved as "founded in year 0". Stripping the
 * empty value to `undefined` *before* coercion is what keeps optional actually
 * optional. Same helper, same reasoning, as `app/buyer/profile/schema.ts`.
 *
 * Accepting an already-parsed number as well as a string is what lets the
 * client submit its parsed values to a Server Action that re-validates with
 * this same schema (CLAUDE.md → Conventions).
 */
const optionalInt = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce
    .number()
    .int("Enter a whole number")
    .positive("Enter a value above zero")
    .max(INT4_MAX, "That figure is too large")
    .optional()
);

const requiredInt = (label: string) =>
  z.coerce
    .number()
    .int(`${label} must be a whole number`)
    .positive(`${label} must be above zero`)
    .max(INT4_MAX, `${label} is too large`);

/**
 * Fields every listing has, regardless of category.
 *
 * Countries and industries are constrained to `src/lib/taxonomy.ts` — the same
 * closed vocabulary the seed, the buyer filter bar and the buyer profile read.
 * A listing typed in free text would exist but be unreachable through every
 * filter in the app, which reads as a broken filter rather than as bad data.
 */
const baseAssetSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Give the listing a title of at least 3 characters")
    .max(120, "Keep the title under 120 characters"),
  country: z.string().min(2, "Choose a country"),
  industry: z.string().min(2, "Choose an industry"),
  businessStatus: z.enum(["ACTIVE", "DORMANT", "IN_LIQUIDATION"]),
  askingPrice: requiredInt("Asking price"),
  employees: z.string().trim().max(40, "Keep this under 40 characters").optional(),
  yearFounded: optionalInt,
  description: z
    .string()
    .trim()
    .min(20, "Describe the opportunity in at least 20 characters")
    .max(2000, "Keep the description under 2000 characters"),
  keyAssetsIncluded: z
    .array(z.string().trim().min(1))
    .max(10, "Up to 10 items")
    .default([]),
});

/**
 * Category-specific fields are nullable at the DB level and required-by-category
 * here: Prisma cannot express "required only when category = X", so this union
 * is the only thing standing between a LICENSE row and a missing regulator.
 *
 * A discriminated union validates the whole object at once, which is why the UI
 * is one form rather than a wizard (CLAUDE.md → Asset validation): a multi-step
 * form would have to re-run the union against half-filled input at every step.
 */
export const assetSchema = z.discriminatedUnion("category", [
  baseAssetSchema.extend({
    category: z.literal("LICENSE"),
    regulatoryBody: z.string().trim().min(1, "Name the regulator"),
    licenseType: z.string().trim().min(1, "Name the licence type"),
  }),
  baseAssetSchema.extend({
    category: z.literal("OPERATING_BUSINESS"),
    annualRevenue: requiredInt("Annual revenue"),
    reasonForSale: z
      .string()
      .trim()
      .max(500, "Keep this under 500 characters")
      .optional(),
  }),
  baseAssetSchema.extend({
    category: z.literal("STAKE"),
    stakePercentage: z.coerce
      .number()
      .int("Enter a whole percentage")
      .min(1, "A stake must be at least 1%")
      .max(100, "A stake cannot exceed 100%"),
    // Optional here and only here: a pre-revenue stake sale legitimately has no
    // revenue figure, and the seed contains one to prove it.
    annualRevenue: optionalInt,
  }),
]);

/** What the form holds — `z.preprocess` types its own input as `unknown`, so the
 *  optional numbers are loosely typed here by construction. */
export type AssetInput = z.input<typeof assetSchema>;

/** What the action receives after parsing — numbers are numbers or absent. */
export type AssetValues = z.output<typeof assetSchema>;

/**
 * The category-specific columns, named once.
 *
 * The form clears exactly these on a category change and `sanitizeByCategory`
 * nulls exactly these before a write — two behaviours that have to agree, so
 * they read from one list.
 */
export const CATEGORY_FIELDS = [
  "regulatoryBody",
  "licenseType",
  "annualRevenue",
  "reasonForSale",
  "stakePercentage",
] as const;

export type CategoryField = (typeof CATEGORY_FIELDS)[number];

/**
 * Every column a seller controls, ready for `prisma.asset.create/update`.
 *
 * Note what is absent: `sellerId` and `listingStatus`. Ownership comes from the
 * session, and moderation state is the manager's alone — a seller editing a
 * listing a manager suspended must not be able to write it back to ACTIVE, and
 * the cleanest way to guarantee that is for the write payload to have no such
 * field at all.
 */
export type AssetWriteData = {
  title: string;
  category: AssetCategory;
  country: string;
  industry: string;
  businessStatus: BusinessStatus;
  askingPrice: number;
  employees: string | null;
  yearFounded: number | null;
  description: string;
  keyAssetsIncluded: string[];
  regulatoryBody: string | null;
  licenseType: string | null;
  annualRevenue: number | null;
  reasonForSale: string | null;
  stakePercentage: number | null;
};

/**
 * Flatten a parsed listing into a full column set, with every field belonging to
 * another category explicitly `null`.
 *
 * This is the edge case CLAUDE.md calls out: a listing edited from LICENSE to
 * STAKE keeps its old `regulatoryBody` unless the update says otherwise, because
 * `undefined` in a Prisma update means "leave this column alone". The union
 * *strips* the other branches' keys rather than nulling them, so without this
 * the stale value survives in the database — invisible on the detail page (which
 * only reads the fields belonging to the current category) and waiting to
 * reappear the moment the listing is switched back.
 *
 * Used by create as well as update, so the two can never disagree about which
 * columns a write touches. Pure and exported — `plan.md` lists it as a unit-test
 * candidate.
 */
export function sanitizeByCategory(values: AssetValues): AssetWriteData {
  const common = {
    title: values.title,
    country: values.country,
    industry: values.industry,
    businessStatus: values.businessStatus,
    askingPrice: values.askingPrice,
    // `null`, not `undefined`: clearing an optional field has to write an actual
    // null, or the previous value survives the update.
    employees: values.employees ? values.employees : null,
    yearFounded: values.yearFounded ?? null,
    description: values.description,
    keyAssetsIncluded: values.keyAssetsIncluded,
  };

  // Spread first, then let the active branch overwrite what belongs to it. The
  // exhaustive `switch` on the discriminant is what makes a newly added category
  // a compile error here rather than a silently unsanitised write.
  const cleared = {
    regulatoryBody: null,
    licenseType: null,
    annualRevenue: null,
    reasonForSale: null,
    stakePercentage: null,
  };

  switch (values.category) {
    case "LICENSE":
      return {
        ...common,
        ...cleared,
        category: "LICENSE",
        regulatoryBody: values.regulatoryBody,
        licenseType: values.licenseType,
      };

    case "OPERATING_BUSINESS":
      return {
        ...common,
        ...cleared,
        category: "OPERATING_BUSINESS",
        annualRevenue: values.annualRevenue,
        reasonForSale: values.reasonForSale ? values.reasonForSale : null,
      };

    case "STAKE":
      return {
        ...common,
        ...cleared,
        category: "STAKE",
        stakePercentage: values.stakePercentage,
        annualRevenue: values.annualRevenue ?? null,
      };
  }
}
