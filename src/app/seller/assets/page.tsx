import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Store } from "lucide-react";

import {
  ListingsTable,
  type SellerListingRow,
} from "@/components/seller/listings-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "My listings" };

// A bare `prisma.*` read is not one of the dynamic APIs Next detects, so without
// this the page would be prerendered at build time and the seller's listings
// would freeze as of the last deploy (CLAUDE.md pitfall 5).
export const dynamic = "force-dynamic";

export default async function SellerAssetsPage() {
  const user = await requireRole("SELLER");

  const assets = await prisma.asset.findMany({
    // Scoped by the *session* user, never by anything in the request — the only
    // listings this query can return are the caller's own.
    where: { sellerId: user.id },
    orderBy: { createdAt: "desc" },
    // Exactly the columns the table renders: `description` alone is up to 2000
    // characters per row and never appears here.
    select: {
      id: true,
      title: true,
      category: true,
      askingPrice: true,
      listingStatus: true,
      updatedAt: true,
      _count: { select: { inquiries: true } },
    },
  });

  const listings: SellerListingRow[] = assets.map(({ _count, ...asset }) => ({
    ...asset,
    inquiryCount: _count.inquiries,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">My listings</h1>
          <p className="text-sm text-muted-foreground">
            Everything you have published, and how much interest each one has
            drawn.
          </p>
        </div>

        <Button asChild>
          <Link href="/seller/assets/new">
            <Plus aria-hidden="true" />
            New listing
          </Link>
        </Button>
      </div>

      {listings.length === 0 ? (
        <EmptyListings />
      ) : (
        <ListingsTable listings={listings} />
      )}
    </div>
  );
}

/**
 * One empty state, not two: there are no filters on this screen, so an empty
 * table can only ever mean "you haven't published anything" — never "nothing
 * matched", which is the distinction buyer browse has to draw.
 */
function EmptyListings() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <Store className="size-8 text-muted-foreground" aria-hidden="true" />

        <div className="space-y-1">
          <p className="font-medium">No listings yet</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Publish a licence, an operating business or an equity stake, and it
            appears in buyer browse straight away.
          </p>
        </div>

        <Button asChild size="sm" className="mt-1">
          <Link href="/seller/assets/new">Publish your first listing</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
