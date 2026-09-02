import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";

import { AssetForm, type AssetFormDefaults } from "@/components/seller/asset-form";
import { Card, CardContent } from "@/components/ui/card";
import { ModerationStatusBadge } from "@/components/moderation/status-badge";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * A listing is editable only by the seller who owns it.
 *
 * Scoped by `sellerId` in the query rather than fetched and then compared, so
 * there is no branch in which another seller's row is in memory at all. Shared
 * by the page and its metadata — deduped per request by React's `cache`, so the
 * two callers cost one query and a listing that isn't yours cannot leak its
 * title through the browser tab while the body 404s.
 */
const findOwnAsset = cache(async (id: string, sellerId: string) =>
  prisma.asset.findFirst({
    where: { id, sellerId },
    select: {
      id: true,
      title: true,
      category: true,
      country: true,
      industry: true,
      businessStatus: true,
      listingStatus: true,
      askingPrice: true,
      employees: true,
      yearFounded: true,
      description: true,
      keyAssetsIncluded: true,
      regulatoryBody: true,
      licenseType: true,
      annualRevenue: true,
      reasonForSale: true,
      stakePercentage: true,
    },
  })
);

export async function generateMetadata({
  params,
}: PageProps<"/seller/assets/[id]/edit">): Promise<Metadata> {
  const { id } = await params;
  const user = await requireRole("SELLER");
  const asset = await findOwnAsset(id, user.id);

  return { title: asset ? `Edit — ${asset.title}` : "Listing not found" };
}

export default async function EditAssetPage({
  params,
}: PageProps<"/seller/assets/[id]/edit">) {
  const { id } = await params;

  // Authorisation first, then the read. A redirect aborts the response either
  // way, so running them together saves nothing worth having.
  const user = await requireRole("SELLER");

  const asset = await findOwnAsset(id, user.id);

  // Another seller's listing is indistinguishable from one that never existed —
  // the same rule the buyer detail page applies to moderated listings.
  if (!asset) notFound();

  // A withdrawn listing is terminal: `updateAsset` refuses it server-side, so
  // rendering the form would be an invitation to a guaranteed failure.
  if (asset.listingStatus === "REMOVED") {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <BackLink />
        <h1 className="text-2xl font-semibold tracking-tight">{asset.title}</h1>
        <Card>
          <CardContent className="flex items-start gap-3 py-8">
            <ShieldAlert
              className="mt-0.5 size-5 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <p className="text-sm font-medium">This listing was removed</p>
              <p className="text-sm text-muted-foreground">
                It is hidden from buyers and can no longer be edited. Publish a new
                listing if you want to offer this asset again.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const defaults: AssetFormDefaults = asset;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink />

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Edit listing</h1>
          <ModerationStatusBadge status={asset.listingStatus} />
        </div>
        <p className="text-sm text-muted-foreground">
          Changes are live for buyers as soon as you save.
        </p>
      </div>

      {/* `listingStatus` is the manager's field, not the seller's — the write
          payload has no such key at all (see `sanitizeByCategory`). Saying so
          plainly beats letting a seller edit in the hope that it republishes. */}
      {asset.listingStatus === "SUSPENDED" && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-start gap-3">
            <ShieldAlert
              className="mt-0.5 size-5 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <div className="space-y-1 text-sm">
              <p className="font-medium">
                A platform manager has suspended this listing
              </p>
              <p className="text-muted-foreground">
                Buyers cannot see it. You can still correct it here, but editing
                does not restore it — a manager has to lift the suspension.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <AssetForm assetId={asset.id} defaults={defaults} />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/seller/assets"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Back to my listings
    </Link>
  );
}
