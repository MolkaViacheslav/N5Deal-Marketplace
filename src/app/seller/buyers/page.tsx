import type { Metadata } from "next";

import { BuyerCard, type BuyerCardData } from "@/components/seller/buyer-card";
import { BuyersFilters } from "@/components/seller/buyers-filters";
import { BuyersEmptyState } from "@/components/seller/buyers-empty-state";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import {
  buildBuyersQuery,
  buildBuyerWhere,
  hasActiveFilters,
  parseSellerBuyerFilters,
} from "@/app/seller/buyers/filters";

export const metadata: Metadata = { title: "Buyers" };

// `searchParams` alone would opt this route out of static rendering, but the
// export is kept explicit: the guarantee should not silently depend on the
// filter bar continuing to exist (CLAUDE.md pitfall 5).
export const dynamic = "force-dynamic";

export default async function SellerBuyersPage({
  searchParams,
}: PageProps<"/seller/buyers">) {
  await requireRole("SELLER");

  const filters = parseSellerBuyerFilters(await searchParams);
  const isFiltered = hasActiveFilters(filters);
  // Handed to every card so the profile page can link back to *this* list.
  const listQuery = buildBuyersQuery(filters);

  const buyers: BuyerCardData[] = await prisma.user.findMany({
    // `role: "BUYER", status: "ACTIVE"` is baked into the where and can never be
    // widened by the query string — a suspended buyer is not approachable.
    where: buildBuyerWhere(filters),
    orderBy: { createdAt: "desc" },
    // Exactly what the card renders. `email` is absent on purpose: the seller
    // opens the conversation through an inquiry, and the address is revealed
    // when the buyer replies.
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
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Buyers</h1>
        <p className="text-sm text-muted-foreground">
          Investors and acquirers on the platform, and what they said they are
          looking for.
        </p>
      </div>

      <BuyersFilters filters={filters} />

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {buyers.length} {buyers.length === 1 ? "buyer" : "buyers"}
        {isFiltered && " matching your filters"}
      </p>

      {buyers.length === 0 ? (
        <BuyersEmptyState isFiltered={isFiltered} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {buyers.map((buyer) => (
            <li key={buyer.id}>
              {/* No `matchScore` yet — Phase 7 computes it, and the card renders
                  no badge at all when it is absent, never a "0% match". */}
              <BuyerCard buyer={buyer} listQuery={listQuery} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
