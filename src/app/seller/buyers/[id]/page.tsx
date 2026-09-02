import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Wallet } from "lucide-react";

import { ContactBuyerDialog } from "@/components/seller/contact-buyer-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatBudgetRange } from "@/components/seller/format-budget";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import {
  buildBuyersQuery,
  parseSellerBuyerFilters,
} from "@/app/seller/buyers/filters";

export const dynamic = "force-dynamic";

/**
 * A buyer is visible to sellers only while they are an ACTIVE buyer.
 *
 * Enforced in the query rather than checked after the fetch, so a suspended
 * account has no path to being rendered. Shared by the page and its metadata so
 * a moderated buyer cannot leak their name through the browser tab while the
 * body 404s — deduped per request by React's `cache`, so the two cost one query.
 */
const findVisibleBuyer = cache(async (id: string) =>
  prisma.user.findFirst({
    where: { id, role: "BUYER", status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      companyName: true,
      createdAt: true,
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
  })
);

export async function generateMetadata({
  params,
}: PageProps<"/seller/buyers/[id]">): Promise<Metadata> {
  const { id } = await params;
  const buyer = await findVisibleBuyer(id);

  return {
    title: buyer
      ? (buyer.companyName ?? buyer.name)
      : "Buyer not found",
  };
}

export default async function BuyerProfilePage({
  params,
  searchParams,
}: PageProps<"/seller/buyers/[id]">) {
  const { id } = await params;

  // Authorisation first, then the reads.
  const user = await requireRole("SELLER");

  const [buyer, previousInquiry, rawSearchParams] = await Promise.all([
    findVisibleBuyer(id),
    // Keyed off the route param rather than off `buyer.id`, so it needn't wait
    // for the profile read; a row addressed to a nonexistent user can't exist.
    prisma.inquiry.findFirst({
      where: { fromUserId: user.id, toUserId: id },
      select: { id: true },
    }),
    searchParams,
  ]);

  // Not `notFound()` only for a missing row: a suspended or removed buyer must
  // be indistinguishable from one that never existed, or a direct link confirms
  // who was moderated away.
  if (!buyer) notFound();

  const who = buyer.companyName ?? buyer.name;
  const profile = buyer.buyerProfile;

  // The list's filters ride along on this page's URL (the cards put them there),
  // so going back returns the seller to the list they actually had. Re-parsed
  // rather than passed through verbatim — the query string is user-editable, and
  // this link should not be able to carry `?region=Atlantis` back to the list.
  const listQuery = buildBuyersQuery(parseSellerBuyerFilters(rawSearchParams));
  const backHref = listQuery ? `/seller/buyers?${listQuery}` : "/seller/buyers";

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to buyers
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {who}
        </h1>
        {buyer.companyName && (
          <p className="text-muted-foreground">{buyer.name}</p>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-6">
          {profile ? (
            <>
              {profile.description && (
                <section className="space-y-2">
                  <h2 className="text-sm font-medium text-muted-foreground">
                    Mandate
                  </h2>
                  {/* `whitespace-pre-line` keeps the paragraph breaks the buyer
                      typed into their profile textarea. */}
                  <p className="whitespace-pre-line leading-relaxed">
                    {profile.description}
                  </p>
                </section>
              )}

              <Separator />

              <ChipSection
                title="Industries of interest"
                values={profile.industries}
              />
              <ChipSection title="Regions" values={profile.regions} />

              <section className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground">
                  Budget
                </h2>
                <div className="flex items-start gap-2.5 rounded-lg border bg-card p-3">
                  <Wallet
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <p className="font-medium">
                    {formatBudgetRange(profile.budgetMin, profile.budgetMax)}
                  </p>
                </div>
              </section>
            </>
          ) : (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="font-medium">
                  This buyer hasn&apos;t completed their profile
                </p>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  There is nothing here about what they are looking for yet. You
                  can still reach out — say what you have and why it might fit.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle>Get in touch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Send a message to open a conversation. Contact details are exchanged
              directly between the two of you.
            </p>

            <ContactBuyerDialog
              buyerId={buyer.id}
              buyerLabel={who}
              previouslyContacted={previousInquiry !== null}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Renders nothing when the buyer chose none — an empty heading reads as broken
 *  data, a dropped section just reads as a shorter profile. */
function ChipSection({ title, values }: { title: string; values: string[] }) {
  if (values.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      <ul className="flex flex-wrap gap-2">
        {values.map((value) => (
          <li key={value}>
            <Badge variant="secondary">{value}</Badge>
          </li>
        ))}
      </ul>
    </section>
  );
}
