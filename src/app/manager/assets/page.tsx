import type { Metadata } from "next";

import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { AssetsFilters } from "@/components/manager/assets-filters";
import { AssetsTable, type AssetRow } from "@/components/manager/assets-table";
import {
  buildManagerAssetWhere,
  hasActiveFilters,
  parseManagerAssetFilters,
} from "@/app/manager/assets/filters";

export const metadata: Metadata = { title: "Listings" };

export default async function ManagerAssetsPage({
  searchParams,
}: PageProps<"/manager/assets">) {
  // Same defense-in-depth reasoning as /manager/participants — ManagerLayout
  // already guards this, this call is inert but free (React cache()).
  await requireRole("MANAGER");

  const filters = parseManagerAssetFilters(await searchParams);

  const assets = await prisma.asset.findMany({
    where: buildManagerAssetWhere(filters),
    orderBy: { createdAt: "desc" },
    // Explicit, not a whole row: `description` is up to 2000 characters and
    // this table never renders it.
    select: {
      id: true,
      title: true,
      category: true,
      country: true,
      industry: true,
      askingPrice: true,
      listingStatus: true,
      createdAt: true,
      seller: { select: { name: true } },
    },
    // Defensive cap, not real pagination — see the same note on
    // /manager/participants.
    take: 500,
  });

  const rows: AssetRow[] = assets.map(({ seller, ...asset }) => ({
    ...asset,
    sellerName: seller.name,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Listings</h1>
      <AssetsFilters filters={filters} />
      <AssetsTable assets={rows} isFiltered={hasActiveFilters(filters)} />
    </div>
  );
}
