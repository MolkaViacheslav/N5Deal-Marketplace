import type { Metadata } from "next";

import { AssetCard, type AssetCardData } from "@/components/asset/asset-card";
import { AssetFilterBar } from "@/components/buyer/asset-filter-bar";
import { AssetsEmptyState } from "@/components/buyer/assets-empty-state";
import { ProfilePrompt } from "@/components/buyer/profile-prompt";
import {
  RecommendedAssets,
  type RecommendedAsset,
} from "@/components/buyer/recommended-assets";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import {
  compareByMatchDesc,
  computeMatchScore,
  RECOMMENDED_MIN_SCORE,
} from "@/lib/matching";
import {
  buildAssetOrderBy,
  buildAssetsQuery,
  buildAssetWhere,
  DEFAULT_SORT,
  hasActiveFilters,
  parseAssetFilters,
} from "@/app/buyer/assets/filters";

export const metadata: Metadata = { title: "Listings" };

// A bare `prisma.*` read is NOT one of the dynamic APIs Next detects, so
// without this the page is prerendered at build time and the listings freeze
// (CLAUDE.md pitfall 5). `searchParams` alone would in fact opt this route out
// of static rendering, but the export is kept explicit: the guarantee should
// not silently depend on the filter bar continuing to exist.
export const dynamic = "force-dynamic";

/** A listing plus its score, once there is a profile to score it against. */
type ScoredAssetCardData = AssetCardData & { matchScore?: number };

const TOP_RECOMMENDATIONS = 3;

const isRecommended = (
  asset: ScoredAssetCardData
): asset is RecommendedAsset =>
  asset.matchScore !== undefined && asset.matchScore >= RECOMMENDED_MIN_SCORE;

export default async function BuyerAssetsPage({
  searchParams,
}: PageProps<"/buyer/assets">) {
  // The layout has already established this is an ACTIVE buyer; this call is
  // deduped by `cache()` inside `getSessionUser` and just gets us the id.
  const user = await requireRole("BUYER");

  const requested = parseAssetFilters(await searchParams);
  const isFiltered = hasActiveFilters(requested);

  const [profile, assets] = await Promise.all([
    prisma.buyerProfile.findUnique({
      where: { userId: user.id },
      // Exactly `MatchProfile`. The description and budget formatting belong to
      // `/buyer/profile`; nothing on this screen renders them.
      select: {
        industries: true,
        regions: true,
        budgetMin: true,
        budgetMax: true,
      },
    }),
    prisma.asset.findMany({
      where: buildAssetWhere(requested),
      // "best-match" orders as "newest" here — the score has no column to sort
      // by, so it is applied in JS below, on top of this ordering.
      orderBy: buildAssetOrderBy(requested.sort),
      // Selected explicitly rather than fetching whole rows. This is exactly
      // `AssetCardData`: `description` in particular is up to 2000 characters
      // that would cross the RSC boundary once per card and never be rendered.
      select: {
        id: true,
        title: true,
        category: true,
        businessStatus: true,
        listingStatus: true,
        country: true,
        industry: true,
        askingPrice: true,
        employees: true,
        yearFounded: true,
        keyAssetsIncluded: true,
        // Category-specific; the card shows the pair that matches its category.
        regulatoryBody: true,
        licenseType: true,
        annualRevenue: true,
        reasonForSale: true,
        stakePercentage: true,
      },
    }),
  ]);

  // A "best-match" sort with no profile behind it is dropped the same way an
  // unknown `?country=` is: silently, back to the default. The bar renders
  // these filters rather than the requested ones, so it can never display a
  // sort the list is not applying — and the detail page's back link, built
  // below, carries the honest one.
  const filters =
    profile === null && requested.sort === "best-match"
      ? { ...requested, sort: DEFAULT_SORT }
      : requested;

  // Handed to every card so the detail page can link back to *this* list.
  const listQuery = buildAssetsQuery(filters);

  const scored: ScoredAssetCardData[] = profile
    ? assets.map((asset) => ({
        ...asset,
        matchScore: computeMatchScore(profile, asset),
      }))
    : assets;

  if (filters.sort === "best-match") {
    // Stable, so listings on the same score stay newest-first.
    scored.sort((a, b) => compareByMatchDesc(a.matchScore, b.matchScore));
  }

  // Only on the untouched view. Once a buyer filters or sorts they have stated
  // what they want, and a "Recommended" strip would just repeat the first cards
  // of the grid below back at them.
  const recommended =
    !isFiltered && filters.sort === DEFAULT_SORT
      ? scored
          .filter(isRecommended)
          // The same comparator the sort uses. `isRecommended` has already
          // ruled out `undefined`, so `b.matchScore - a.matchScore` would be
          // equivalent — but there is one spelling of "highest first" in this
          // codebase and a second one is how they eventually disagree.
          .sort((a, b) => compareByMatchDesc(a.matchScore, b.matchScore))
          .slice(0, TOP_RECOMMENDATIONS)
      : [];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Listings</h1>
        <p className="text-sm text-muted-foreground">
          Licences, operating businesses and equity stakes available across the
          EEA.
        </p>
      </div>

      {profile === null && <ProfilePrompt />}

      <AssetFilterBar filters={filters} hasProfile={profile !== null} />

      <RecommendedAssets assets={recommended} />

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {scored.length} {scored.length === 1 ? "listing" : "listings"}
        {isFiltered && " matching your filters"}
      </p>

      {scored.length === 0 ? (
        <AssetsEmptyState isFiltered={isFiltered} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scored.map((asset) => (
            <li key={asset.id}>
              <AssetCard
                asset={asset}
                matchScore={asset.matchScore}
                listQuery={listQuery}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
