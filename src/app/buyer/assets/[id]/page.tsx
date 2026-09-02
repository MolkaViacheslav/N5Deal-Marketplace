import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, CalendarDays, MapPin, Users } from "lucide-react";

import { AssetBadges } from "@/components/asset/asset-badges";
import { AssetDetailFacts } from "@/components/asset/asset-detail-facts";
import { ContactDialog } from "@/components/buyer/contact-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { formatEur } from "@/lib/taxonomy";
import {
  buildAssetsQuery,
  parseAssetFilters,
} from "@/app/buyer/assets/filters";

export const dynamic = "force-dynamic";

/**
 * A listing is visible only while both it and its seller are ACTIVE.
 *
 * Shared by the page and its metadata so a moderated listing cannot leak its
 * title through the browser tab while the body 404s. Deduped per request by
 * React's `cache`, so the two callers cost one query.
 */
const findVisibleAsset = cache(async (id: string) =>
  prisma.asset.findFirst({
    where: {
      id,
      listingStatus: "ACTIVE",
      seller: { status: "ACTIVE" },
    },
    include: {
      seller: {
        select: { id: true, name: true, companyName: true },
      },
    },
  })
);

export async function generateMetadata({
  params,
}: PageProps<"/buyer/assets/[id]">): Promise<Metadata> {
  const { id } = await params;
  const asset = await findVisibleAsset(id);

  return { title: asset?.title ?? "Listing not found" };
}

export default async function AssetDetailPage({
  params,
  searchParams,
}: PageProps<"/buyer/assets/[id]">) {
  const { id } = await params;

  // Authorisation first, and only then the reads. Running them together saves
  // nothing worth having — a redirect aborts the response either way — while
  // issuing DB queries on behalf of a caller who has not been checked yet is
  // the wrong default to leave in a codebase.
  const user = await requireRole("BUYER");

  const [asset, previousInquiry, rawSearchParams] = await Promise.all([
    findVisibleAsset(id),
    // Keyed off the route param rather than off `asset.id`, so it doesn't have
    // to wait for the listing read; a row for a nonexistent asset can't exist.
    prisma.inquiry.findFirst({
      where: { fromUserId: user.id, assetId: id },
      select: { id: true },
    }),
    searchParams,
  ]);

  // Not `notFound()` only for a missing row: a suspended or removed listing
  // must be indistinguishable from one that never existed, otherwise a direct
  // link confirms what was moderated away.
  if (!asset) notFound();

  const sellerLabel = asset.seller.companyName ?? asset.seller.name;

  // The browse filters ride along on this page's own URL (the cards put them
  // there), so going back returns the buyer to the list they actually had
  // rather than resetting it. Re-parsed rather than passed through verbatim:
  // the query string is user-editable like any other, and this link should not
  // be able to carry `?country=Atlantis` back to the list page.
  const listQuery = buildAssetsQuery(parseAssetFilters(rawSearchParams));
  const backHref = listQuery ? `/buyer/assets?${listQuery}` : "/buyer/assets";

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to listings
      </Link>

      <header className="space-y-3">
        <AssetBadges
          category={asset.category}
          businessStatus={asset.businessStatus}
          country={asset.country}
        />
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {asset.title}
        </h1>
        <p className="text-3xl font-semibold text-primary">
          {formatEur(asset.askingPrice)}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-6">
          <section className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              Overview
            </h2>
            {/* `whitespace-pre-line` keeps the paragraph breaks a seller typed
                into the textarea; without it the description collapses into
                one wall of text. */}
            <p className="whitespace-pre-line leading-relaxed">
              {asset.description}
            </p>
          </section>

          <Separator />

          <section className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">
              At a glance
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Attribute
                icon={Building2}
                label="Industry"
                value={asset.industry}
              />
              <Attribute icon={MapPin} label="Country" value={asset.country} />
              <Attribute
                icon={Users}
                label="Employees"
                value={asset.employees}
              />
              <Attribute
                icon={CalendarDays}
                label="Year founded"
                value={asset.yearFounded}
              />
            </dl>
          </section>

          <AssetDetailFacts asset={asset} />

          {asset.keyAssetsIncluded.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                What&apos;s included
              </h2>
              <ul className="flex flex-wrap gap-2">
                {asset.keyAssetsIncluded.map((item) => (
                  <li
                    key={item}
                    className="rounded-md bg-muted px-2.5 py-1 text-sm"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <Card className="lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle>Seller</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium">{sellerLabel}</p>
              {asset.seller.companyName && (
                <p className="text-sm text-muted-foreground">
                  {asset.seller.name}
                </p>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              Send a message to open a conversation about this listing. Contact
              details are exchanged directly between the two of you.
            </p>

            <ContactDialog
              assetId={asset.id}
              assetTitle={asset.title}
              sellerLabel={sellerLabel}
              previouslyContacted={previousInquiry !== null}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Attribute({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string | number | null;
}) {
  if (value === null || value === "") return null;

  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="font-medium">{value}</dd>
      </div>
    </div>
  );
}
