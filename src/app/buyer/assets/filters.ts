// URL ⇄ query translation for buyer browse.
//
// List state lives in `searchParams`, not React state (CLAUDE.md → Conventions):
// it survives a refresh, is shareable, and lets the page stay a Server
// Component. That makes the query string user-editable by definition, so every
// value is checked against `taxonomy.ts` here and silently dropped if it isn't
// a real member of the vocabulary.
//
// Dropped, not rejected: a stale or hand-mangled link should degrade to a
// broader result set, never to an error page or to an empty list that looks
// like "no matches" when the filter itself was nonsense.

import { COUNTRIES, INDUSTRIES, ASSET_CATEGORIES } from "@/lib/taxonomy";
import type { Prisma } from "@/generated/prisma/client";
import type { AssetCategory } from "@/generated/prisma/enums";

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

/** What an absent `sort` means. Kept out of the URL so a shared link carries
 *  only the filters the user actually chose. */
export const DEFAULT_SORT: SortOption = "newest";

export type AssetFilters = {
  // Named `search`, not `q`: CLAUDE.md → AI feature specifies that
  // `/api/ai/parse-query` returns `{ search?, country?, industry?, category?,
  // priceMin?, priceMax? }` and that those values are written straight into
  // `searchParams`. Matching that shape now means Phase 8 wires into the
  // existing filtering path with no translation layer.
  search: string;
  country: string | null;
  category: AssetCategory | null;
  industry: string | null;
  priceMin: number | null;
  priceMax: number | null;
  sort: SortOption;
};

/** Next hands repeated keys through as arrays; we only ever want one value. */
type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(raw: string | string[] | undefined): string | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function oneOf<T extends string>(
  raw: string | string[] | undefined,
  allowed: readonly T[]
): T | null {
  const value = firstValue(raw);
  return value && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

/**
 * Prices arrive as strings from `<input type="number">`. Anything non-numeric,
 * negative, or absurd is dropped rather than clamped — a filter the user did
 * not ask for is worse than no filter.
 *
 * Exported because the filter bar has to apply exactly this rule *before* it
 * writes to the URL. Left to the parser alone, typing `0` into Min price puts
 * `priceMin=0` in the query, the parser drops it, and the input goes on
 * displaying a filter that is not applied — the same disagreement between the
 * bar and the list that the selects are careful to avoid.
 */
export function positiveInt(raw: string | string[] | undefined): number | null {
  const value = firstValue(raw);
  if (!value) return null;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

const CATEGORY_VALUES = ASSET_CATEGORIES.map((c) => c.value);
const SORT_VALUES = SORT_OPTIONS.map((s) => s.value);

// Long enough for any real search, short enough that the string never reaches
// Postgres as a multi-kilobyte ILIKE pattern.
const MAX_QUERY_LENGTH = 100;

export function parseAssetFilters(params: RawSearchParams): AssetFilters {
  return {
    search: (firstValue(params.search) ?? "").slice(0, MAX_QUERY_LENGTH),
    country: oneOf(params.country, COUNTRIES),
    category: oneOf(params.category, CATEGORY_VALUES),
    industry: oneOf(params.industry, INDUSTRIES),
    priceMin: positiveInt(params.priceMin),
    priceMax: positiveInt(params.priceMax),
    sort: oneOf(params.sort, SORT_VALUES) ?? DEFAULT_SORT,
  };
}

/**
 * The canonical query string for a set of filters — the inverse of
 * `parseAssetFilters`, and the reason a listing's "Back to listings" link can
 * return the buyer to the exact list they came from instead of resetting it.
 *
 * Built from the *parsed* filters, so anything the parser dropped is dropped
 * from the link too, and the default sort never shows up as noise in a URL a
 * buyer might share.
 */
export function buildAssetsQuery(filters: AssetFilters): string {
  const params = new URLSearchParams();

  if (filters.search) params.set("search", filters.search);
  if (filters.category) params.set("category", filters.category);
  if (filters.country) params.set("country", filters.country);
  if (filters.industry) params.set("industry", filters.industry);
  if (filters.priceMin !== null) params.set("priceMin", String(filters.priceMin));
  if (filters.priceMax !== null) params.set("priceMax", String(filters.priceMax));
  if (filters.sort !== DEFAULT_SORT) params.set("sort", filters.sort);

  return params.toString();
}

/** True when anything is narrowing the list — drives the "Clear all" affordance
 *  and tells an empty result apart from an empty marketplace. */
export function hasActiveFilters(filters: AssetFilters): boolean {
  return Boolean(
    filters.search ||
      filters.country ||
      filters.category ||
      filters.industry ||
      filters.priceMin ||
      filters.priceMax
  );
}

export function buildAssetWhere(filters: AssetFilters): Prisma.AssetWhereInput {
  const where: Prisma.AssetWhereInput = {
    listingStatus: "ACTIVE",
    // Belt and braces. Suspending a seller already cascades to their listings
    // (CLAUDE.md → Manager actions), so this clause should never change the
    // result — but browse is the one surface where a missed cascade would leak
    // a moderated seller's inventory to every buyer, and the compound index
    // still leads on `listingStatus`.
    seller: { status: "ACTIVE" },
  };

  if (filters.country) where.country = filters.country;
  if (filters.category) where.category = filters.category;
  if (filters.industry) where.industry = filters.industry;

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
      { industry: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  // A min above the max is a user mistake, not an attack: both bounds are kept
  // so the result is honestly empty rather than silently reinterpreted.
  if (filters.priceMin !== null || filters.priceMax !== null) {
    where.askingPrice = {
      ...(filters.priceMin !== null && { gte: filters.priceMin }),
      ...(filters.priceMax !== null && { lte: filters.priceMax }),
    };
  }

  return where;
}

export function buildAssetOrderBy(
  sort: SortOption
): Prisma.AssetOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ askingPrice: "asc" }, { createdAt: "desc" }];
    case "price_desc":
      return [{ askingPrice: "desc" }, { createdAt: "desc" }];
    case "newest":
      return [{ createdAt: "desc" }];
  }
}
