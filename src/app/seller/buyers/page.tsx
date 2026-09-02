import type { Metadata } from "next";

import { BuyerCard, type BuyerCardData } from "@/components/seller/buyer-card";
import { BuyersFilters } from "@/components/seller/buyers-filters";
import { BuyersEmptyState } from "@/components/seller/buyers-empty-state";
import { ListingsPrompt } from "@/components/seller/listings-prompt";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { bestMatchScore, compareByMatchDesc } from "@/lib/matching";
import {
  buildBuyersQuery,
  buildBuyerWhere,
  DEFAULT_SORT,
  hasActiveFilters,
  parseSellerBuyerFilters,
} from "@/app/seller/buyers/filters";

export const metadata: Metadata = { title: "Buyers" };

// `searchParams` alone would opt this route out of static rendering, but the
// export is kept explicit: the guarantee should not silently depend on the
// filter bar continuing to exist (CLAUDE.md pitfall 5).
export const dynamic = "force-dynamic";

/** A buyer plus how well they fit this seller's inventory. */
type ScoredBuyer = BuyerCardData & { matchScore?: number };

export default async function SellerBuyersPage({
  searchParams,
}: PageProps<"/seller/buyers">) {
  const user = await requireRole("SELLER");

  const requested = parseSellerBuyerFilters(await searchParams);
  const isFiltered = hasActiveFilters(requested);

  const [buyers, listings] = await Promise.all([
    prisma.user.findMany({
      // `role: "BUYER", status: "ACTIVE"` is baked into the where and can never
      // be widened by the query string — a suspended buyer is not approachable.
      where: buildBuyerWhere(requested),
      // "best-match" is applied in JS below, on top of this ordering, so equal
      // scores stay newest-first.
      orderBy: { createdAt: "desc" },
      // Exactly what the card renders, plus what matching needs — the profile's
      // industries, regions and budget bounds are both. `email` is absent on
      // purpose: the seller opens the conversation through an inquiry, and the
      // address is revealed when the buyer replies.
      select: {
        id: true,
        name: true,
        companyName: true,
        buyerProfile: {
          select: {
            industries: true,
            regions: true,
            budgetMin: true,
            budgetMax: true,
            description: true,
          },
        },
      },
      // Defensive cap, not real pagination — the same treatment the manager's
      // tables get, and called out in the README as a deliberate cut.
      take: 500,
    }),
    // Every listing this seller owns, whatever its moderation state: a
    // withdrawn or suspended listing still describes what they deal in, and a
    // seller reading "0 buyers match" the day after a manager suspended one
    // listing would be reading a moderation event as a market signal.
    prisma.asset.findMany({
      where: { sellerId: user.id },
      select: { country: true, industry: true, askingPrice: true },
    }),
  ]);

  // Nothing published means nothing to score against, so a "best match" sort
  // would be sorting by a column of blanks. Dropped back to the default, and
  // the bar renders these filters rather than the requested ones so it cannot
  // offer a sort the list is not applying.
  const filters =
    listings.length === 0 && requested.sort === "best-match"
      ? { ...requested, sort: DEFAULT_SORT }
      : requested;

  // Handed to every card so the profile page can link back to *this* list.
  const listQuery = buildBuyersQuery(filters);

  const scored: ScoredBuyer[] =
    listings.length === 0
      ? buyers
      : buyers.map((buyer) => ({
          ...buyer,
          // A buyer who has not described their interests scores nothing at
          // all — `undefined`, not 0. There is no mandate to compare, which is
          // a different statement from "nothing about them fits".
          matchScore: buyer.buyerProfile
            ? bestMatchScore(buyer.buyerProfile, listings)
            : undefined,
        }));

  if (filters.sort === "best-match") {
    // Stable, and `compareByMatchDesc` puts the unscored last — so buyers with
    // no profile sink to the bottom instead of being read as a 0% match.
    scored.sort((a, b) => compareByMatchDesc(a.matchScore, b.matchScore));
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Buyers</h1>
        <p className="text-sm text-muted-foreground">
          Investors and acquirers on the platform, and what they said they are
          looking for.
        </p>
      </div>

      {listings.length === 0 && <ListingsPrompt />}

      <BuyersFilters filters={filters} hasListings={listings.length > 0} />

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {scored.length} {scored.length === 1 ? "buyer" : "buyers"}
        {isFiltered && " matching your filters"}
      </p>

      {scored.length === 0 ? (
        <BuyersEmptyState isFiltered={isFiltered} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scored.map((buyer) => (
            <li key={buyer.id}>
              <BuyerCard
                buyer={buyer}
                matchScore={buyer.matchScore}
                listQuery={listQuery}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
