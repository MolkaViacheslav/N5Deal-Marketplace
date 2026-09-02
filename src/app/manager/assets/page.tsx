import type { Metadata } from "next";

import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { AssetsFilters } from "@/components/manager/assets-filters";
import { AssetsTable, type AssetRow } from "@/components/manager/assets-table";
import { ASSET_CATEGORIES, COUNTRIES } from "@/lib/taxonomy";
import type { AssetCategory, ListingStatus } from "@/generated/prisma/enums";
import type { AssetWhereInput } from "@/generated/prisma/models";

export const metadata: Metadata = { title: "Listings" };

const VALID_CATEGORIES = ASSET_CATEGORIES.map((c) => c.value) as AssetCategory[];
const VALID_COUNTRIES: readonly string[] = COUNTRIES;
const VALID_STATUSES: ListingStatus[] = ["ACTIVE", "SUSPENDED", "REMOVED"];

export default async function ManagerAssetsPage({
  searchParams,
}: PageProps<"/manager/assets">) {
  // Same defense-in-depth reasoning as /manager/participants — ManagerLayout
  // already guards this, this call is inert but free (React cache()).
  await requireRole("MANAGER");

  const params = await searchParams;
  const categoryParam = typeof params.category === "string" ? params.category : undefined;
  const countryParam = typeof params.country === "string" ? params.country : undefined;
  const statusParam = typeof params.listingStatus === "string" ? params.listingStatus : undefined;
  const search = typeof params.search === "string" ? params.search.trim() : "";

  const category = VALID_CATEGORIES.find((candidate) => candidate === categoryParam);
  const country = VALID_COUNTRIES.find((candidate) => candidate === countryParam);
  const listingStatus = VALID_STATUSES.find((candidate) => candidate === statusParam);

  const where: AssetWhereInput = {
    ...(category ? { category } : {}),
    ...(country ? { country } : {}),
    ...(listingStatus ? { listingStatus } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { industry: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const assets = await prisma.asset.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { seller: { select: { name: true } } },
    // Defensive cap, not real pagination — see the same note on
    // /manager/participants.
    take: 500,
  });

  const rows: AssetRow[] = assets.map((asset) => ({
    id: asset.id,
    title: asset.title,
    category: asset.category,
    country: asset.country,
    industry: asset.industry,
    askingPrice: asset.askingPrice,
    listingStatus: asset.listingStatus,
    createdAt: asset.createdAt,
    sellerName: asset.seller.name,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Listings</h1>
      <AssetsFilters />
      <AssetsTable assets={rows} />
    </div>
  );
}
