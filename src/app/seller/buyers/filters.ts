// URL ⇄ query translation for the seller's buyer list.
//
// Same rules as `app/buyer/assets/filters.ts` and the two manager screens: parse
// once on the server, validate against the closed vocabulary in `taxonomy.ts`,
// DROP anything that isn't a real member, and hand the *parsed* object to both
// the query and the filter bar — so the bar can never display a filter the list
// isn't applying.
//
// This is the reciprocal of buyer browse: there, a buyer filters listings by
// country and industry; here, a seller filters buyers by the regions and
// industries they said they were interested in.

import { firstValue, oneOf, searchText, type RawSearchParams } from "@/lib/search-params";
import { INDUSTRIES, REGIONS } from "@/lib/taxonomy";
import type { Prisma } from "@/generated/prisma/client";

export const SORT_OPTIONS = [
  { value: "recent", label: "Recently joined" },
  // Applied in JS after the fetch: a buyer's score is the best they reach
  // against any of this seller's listings, which is not something the database
  // can order by. The page drops it back to the default when the seller has no
  // listings, and the filter bar hides the option in that case.
  { value: "best-match", label: "Best match" },
] as const;

export type SellerBuyerSort = (typeof SORT_OPTIONS)[number]["value"];

/** What an absent `sort` means. Kept out of the URL so a shared link carries
 *  only the choices the seller actually made. */
export const DEFAULT_SORT: SellerBuyerSort = "recent";

export type SellerBuyerFilters = {
  search: string;
  industry: string | null;
  region: string | null;
  /** An asking price. Matches buyers whose budget range covers it. */
  budgetFor: number | null;
  sort: SellerBuyerSort;
};

/**
 * Same rule as the buyer bar's price inputs, and exported for the same reason:
 * the filter bar has to apply it *before* writing to the URL, or typing `0`
 * puts `budgetFor=0` in the query, the parser drops it, and the input goes on
 * showing a filter that is not applied.
 */
export function positiveInt(raw: string | string[] | undefined): number | null {
  const value = firstValue(raw);
  if (!value) return null;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

const SORT_VALUES = SORT_OPTIONS.map((option) => option.value);

export function parseSellerBuyerFilters(
  params: RawSearchParams
): SellerBuyerFilters {
  return {
    search: searchText(params.search),
    industry: oneOf(params.industry, INDUSTRIES),
    region: oneOf(params.region, REGIONS),
    budgetFor: positiveInt(params.budgetFor),
    sort: oneOf(params.sort, SORT_VALUES) ?? DEFAULT_SORT,
  };
}

/** True when any filter narrows the list — tells "nobody matches" apart from
 *  "there are no buyers", which are different answers needing different copy.
 *  Sort is not a filter: it reorders the same rows, so it does not belong here
 *  and must not make an unfiltered list claim to be filtered. */
export function hasActiveFilters(filters: SellerBuyerFilters): boolean {
  return Boolean(
    filters.search || filters.industry || filters.region || filters.budgetFor
  );
}

/** The canonical query string for a set of filters — lets a buyer's profile page
 *  link back to the exact list the seller came from. Built from the *parsed*
 *  filters, so anything the parser dropped is dropped from the link too. */
export function buildBuyersQuery(filters: SellerBuyerFilters): string {
  const params = new URLSearchParams();

  if (filters.search) params.set("search", filters.search);
  if (filters.industry) params.set("industry", filters.industry);
  if (filters.region) params.set("region", filters.region);
  if (filters.budgetFor !== null) {
    params.set("budgetFor", String(filters.budgetFor));
  }
  if (filters.sort !== DEFAULT_SORT) params.set("sort", filters.sort);

  return params.toString();
}

export function buildBuyerWhere(
  filters: SellerBuyerFilters
): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {
    // Never widened by a filter. Sellers, managers and non-ACTIVE accounts are
    // not browsable here at all: a suspended or removed buyer must not be
    // approachable, and there is no query string that can put one in this list.
    role: "BUYER",
    status: "ACTIVE",
  };

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
      { companyName: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const profile: Prisma.BuyerProfileWhereInput = {};

  if (filters.industry) profile.industries = { has: filters.industry };
  if (filters.region) profile.regions = { has: filters.region };

  if (filters.budgetFor !== null) {
    // An absent bound is open-ended on that side, not zero: a buyer who set no
    // maximum is interested in anything above their minimum, and treating the
    // null as a real number would exclude exactly the buyers with the widest
    // mandates. Same asymmetry `computeMatchScore` will apply in Phase 7.
    profile.AND = [
      { OR: [{ budgetMin: null }, { budgetMin: { lte: filters.budgetFor } }] },
      { OR: [{ budgetMax: null }, { budgetMax: { gte: filters.budgetFor } }] },
    ];
  }

  // `is` on a nullable to-one relation excludes rows that have no profile at
  // all — which is correct and deliberate: a buyer who has not described their
  // interests cannot be said to match an industry. With no profile filter
  // active they stay in the list, and their card says so plainly rather than
  // rendering an empty profile.
  if (Object.keys(profile).length > 0) where.buyerProfile = { is: profile };

  return where;
}
