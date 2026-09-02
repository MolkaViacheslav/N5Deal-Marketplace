import Link from "next/link";

import { AssetBadges } from "@/components/asset/asset-badges";
import {
  categoryFacts,
  type CategoryFieldsData,
} from "@/components/asset/asset-category-fields";
import { MatchBadge } from "@/components/match/match-badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatEur } from "@/lib/taxonomy";
import type { BusinessStatus, ListingStatus } from "@/generated/prisma/enums";

/**
 * Exactly the columns the card renders — a full Prisma `Asset` satisfies this
 * structurally, so callers may pass one, but the list query does not have to.
 *
 * Declared this way rather than as the `Asset` model itself so the page's
 * `select` is what has to satisfy it: widen the card and the query stops
 * compiling until it also selects the new column, instead of the card silently
 * reading a field the list query never fetched. It also keeps `description` —
 * up to 2000 characters, per card, never rendered here — off the wire.
 */
export type AssetCardData = CategoryFieldsData & {
  id: string;
  title: string;
  businessStatus: BusinessStatus;
  listingStatus: ListingStatus;
  country: string;
  industry: string;
  askingPrice: number;
  employees: string | null;
  yearFounded: number | null;
  keyAssetsIncluded: string[];
};

// Beyond this the tag row wraps to a third line and the cards in a row stop
// lining up. The rest collapse into a "+N" chip.
const VISIBLE_TAGS = 3;

export function AssetCard({
  asset,
  matchScore,
  listQuery = "",
}: {
  asset: AssetCardData;
  /** Absent → no badge at all, never a "0% match": a buyer with no profile has
   *  nothing to be scored against, which is not the same as scoring nothing. */
  matchScore?: number;
  /**
   * The canonical query string of the list this card was rendered in, carried
   * onto the detail URL so its "Back to listings" link can restore the filters
   * instead of dumping the buyer back onto an unfiltered page.
   */
  listQuery?: string;
}) {
  // Defence in depth. Every query that feeds this card already filters on
  // `listingStatus: "ACTIVE"` — this is the backstop for a future caller that
  // forgets, because the cost of leaking a moderated listing into buyer browse
  // is much higher than the cost of one comparison.
  if (asset.listingStatus !== "ACTIVE") return null;

  const hiddenTags = asset.keyAssetsIncluded.length - VISIBLE_TAGS;

  return (
    <Card className="group/asset relative h-full transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <AssetBadges
            category={asset.category}
            businessStatus={asset.businessStatus}
            country={asset.country}
          />
          {matchScore !== undefined && (
            <MatchBadge score={matchScore} context="against your buyer profile" />
          )}
        </div>

        <CardTitle className="mt-2">
          {/* The link stretches over the whole card (the `relative` above is
              what it anchors to) so the entire surface is clickable, while the
              accessible name stays just the title. */}
          <Link
            href={`/buyer/assets/${asset.id}${listQuery ? `?${listQuery}` : ""}`}
            className="after:absolute after:inset-0 line-clamp-2 outline-none"
          >
            {asset.title}
          </Link>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Fact label="Industry" value={asset.industry} />
          <Fact label="Employees" value={asset.employees} />
          <Fact label="Founded" value={asset.yearFounded} />
          {categoryFacts(asset, { compact: true }).map((fact) => (
            <Fact
              key={fact.label}
              label={fact.label}
              value={fact.value}
              wide={fact.wide}
            />
          ))}
        </dl>

        {asset.keyAssetsIncluded.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {asset.keyAssetsIncluded.slice(0, VISIBLE_TAGS).map((tag) => (
              <li
                key={tag}
                className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {tag}
              </li>
            ))}
            {hiddenTags > 0 && (
              <li className="rounded-md px-2 py-0.5 text-xs text-muted-foreground">
                +{hiddenTags} more
              </li>
            )}
          </ul>
        )}
      </CardContent>

      <CardFooter className="justify-between gap-2">
        <span className="shrink-0 text-xs text-muted-foreground">
          Asking price
        </span>
        <span className="truncate text-lg font-semibold text-primary">
          {formatEur(asset.askingPrice)}
        </span>
      </CardFooter>
    </Card>
  );
}

/**
 * Renders nothing at all when the value is absent — an empty `<dd>` labelled
 * "Employees" reads as missing data, a dropped row just reads as a shorter card.
 */
function Fact({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string | number | null;
  wide?: boolean;
}) {
  if (value === null || value === "") return null;

  return (
    <div className={cn("min-w-0", wide && "col-span-2")}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      {/* Short scalars truncate to one line so the grid stays even; free text
          gets both columns and two lines, because half a sentence is worse
          than no sentence.

          `title` does NOT reach the user here, and the comment that said it did
          was wrong: this card's stretched link covers the whole surface with an
          `after:absolute` overlay, so the pointer never lands on the `<dd>`
          (`MatchBadge` escapes it with `relative z-10`, which is not an option
          for the fact grid — raising it would eat most of the card's click
          area, which is the point of the stretched link). The attribute stays
          because it costs nothing and becomes real the day this card is
          rendered without the overlay; the honest fix for a truncated value is
          the detail page, one click away. */}
      <dd
        className={cn("font-medium", wide ? "line-clamp-2" : "truncate")}
        title={String(value)}
      >
        {value}
      </dd>
    </div>
  );
}
