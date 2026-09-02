import type { Metadata } from "next";

import { AssetCard } from "@/components/asset/asset-card";
import { AssetFilterBar } from "@/components/buyer/asset-filter-bar";
import { AssetsEmptyState } from "@/components/buyer/assets-empty-state";
import { prisma } from "@/lib/db";
import {
  buildAssetOrderBy,
  buildAssetsQuery,
  buildAssetWhere,
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

export default async function BuyerAssetsPage({
  searchParams,
}: PageProps<"/buyer/assets">) {
  const filters = parseAssetFilters(await searchParams);
  const isFiltered = hasActiveFilters(filters);
  // Handed to every card so the detail page can link back to *this* list.
  const listQuery = buildAssetsQuery(filters);

  const assets = await prisma.asset.findMany({
    where: buildAssetWhere(filters),
    orderBy: buildAssetOrderBy(filters.sort),
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
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Listings</h1>
        <p className="text-sm text-muted-foreground">
          Licences, operating businesses and equity stakes available across the
          EEA.
        </p>
      </div>

      <AssetFilterBar filters={filters} />

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {assets.length} {assets.length === 1 ? "listing" : "listings"}
        {isFiltered && " matching your filters"}
      </p>

      {assets.length === 0 ? (
        <AssetsEmptyState isFiltered={isFiltered} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <li key={asset.id}>
              {/* `matchScore` is deliberately not passed yet — Phase 7 computes
                  it. The card renders no badge at all when it is absent. */}
              <AssetCard asset={asset} listQuery={listQuery} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
