"use client";

import { useState } from "react";
import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CategoryBadge } from "@/components/asset/asset-badges";
import { ModerationStatusBadge } from "@/components/moderation/status-badge";
import { WithdrawListingDialog } from "@/components/seller/withdraw-listing-dialog";
import { formatDate, formatEur } from "@/lib/taxonomy";
import type { AssetCategory, ListingStatus } from "@/generated/prisma/enums";

export type SellerListingRow = {
  id: string;
  title: string;
  category: AssetCategory;
  askingPrice: number;
  listingStatus: ListingStatus;
  inquiryCount: number;
  updatedAt: Date;
};

/**
 * The seller's own listings.
 *
 * A table rather than `AssetCard`: the card returns `null` for anything that is
 * not ACTIVE (it is the buyer-facing surface and defends against leaking a
 * moderated listing), while this is the one screen where a seller has to see
 * their suspended and withdrawn rows. The badges are still the shared ones, so
 * a category reads identically here, on buyer browse and in the manager's table.
 */
export function ListingsTable({ listings }: { listings: SellerListingRow[] }) {
  const [withdrawing, setWithdrawing] = useState<SellerListingRow | null>(null);

  return (
    <>
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Asking price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Inquiries</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listings.map((listing) => {
              const isRemoved = listing.listingStatus === "REMOVED";

              return (
                <TableRow key={listing.id}>
                  <TableCell className="font-medium">
                    {isRemoved ? (
                      listing.title
                    ) : (
                      <Link
                        href={`/seller/assets/${listing.id}/edit`}
                        className="underline-offset-4 hover:underline"
                      >
                        {listing.title}
                      </Link>
                    )}
                  </TableCell>
                  <TableCell>
                    <CategoryBadge category={listing.category} />
                  </TableCell>
                  <TableCell>{formatEur(listing.askingPrice)}</TableCell>
                  <TableCell>
                    <ModerationStatusBadge status={listing.listingStatus} />
                  </TableCell>
                  {/* How much interest a listing actually draws — the one number
                      a seller wants from this screen, and free with a _count. */}
                  <TableCell className="text-muted-foreground tabular-nums">
                    {listing.inquiryCount}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(listing.updatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {isRemoved ? (
                      // Withdrawn is terminal, exactly as it is in the manager's
                      // table — nothing left to offer.
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/seller/assets/${listing.id}/edit`}>
                            Edit
                          </Link>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          aria-label={`Withdraw ${listing.title}`}
                          onClick={() => setWithdrawing(listing)}
                        >
                          Withdraw
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* One dialog for the whole table rather than one per row: it is a modal,
          so only ever one can be open, and mounting N of them is N copies of the
          transition state. */}
      {withdrawing && (
        <WithdrawListingDialog
          assetId={withdrawing.id}
          title={withdrawing.title}
          open
          onOpenChange={(open) => {
            if (!open) setWithdrawing(null);
          }}
        />
      )}
    </>
  );
}
