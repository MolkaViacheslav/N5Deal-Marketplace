// URL ⇄ query translation for the manager's listings table.
//
// Same rules as `app/buyer/assets/filters.ts` — see the note there. The two
// are deliberately separate objects rather than one shared filter set: this
// table filters on `listingStatus` (a moderation state a buyer never sees)
// and does not filter on price or industry, and folding both into one type
// would mean every screen carrying fields it has no control for.

import { oneOf, searchText, type RawSearchParams } from "@/lib/search-params";
import {
  ASSET_CATEGORIES,
  COUNTRIES,
  MODERATION_STATUSES,
} from "@/lib/taxonomy";
import type { Prisma } from "@/generated/prisma/client";
import type { AssetCategory, ListingStatus } from "@/generated/prisma/enums";

// `satisfies` rather than a cast: if Prisma's enum ever gains a state, this
// stops compiling instead of silently filtering on a stale vocabulary.
const LISTING_STATUSES = MODERATION_STATUSES.map(
  (status) => status.value
) satisfies ListingStatus[];

const CATEGORY_VALUES = ASSET_CATEGORIES.map((c) => c.value);

export type ManagerAssetFilters = {
  search: string;
  category: AssetCategory | null;
  country: string | null;
  listingStatus: ListingStatus | null;
};

export function parseManagerAssetFilters(
  params: RawSearchParams
): ManagerAssetFilters {
  return {
    search: searchText(params.search),
    category: oneOf(params.category, CATEGORY_VALUES),
    country: oneOf(params.country, COUNTRIES),
    listingStatus: oneOf(params.listingStatus, LISTING_STATUSES),
  };
}

export function buildManagerAssetWhere(
  filters: ManagerAssetFilters
): Prisma.AssetWhereInput {
  return {
    // No `listingStatus: "ACTIVE"` default, unlike buyer browse: moderating
    // means seeing what has already been moderated.
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.country ? { country: filters.country } : {}),
    ...(filters.listingStatus ? { listingStatus: filters.listingStatus } : {}),
    ...(filters.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" } },
            { industry: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}
