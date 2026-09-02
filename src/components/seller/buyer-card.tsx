import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBudgetRange } from "@/components/seller/format-budget";

export type BuyerCardData = {
  id: string;
  name: string;
  companyName: string | null;
  buyerProfile: {
    industries: string[];
    regions: string[];
    budgetMin: number | null;
    budgetMax: number | null;
    description: string | null;
  } | null;
};

// Beyond this the chip rows wrap and cards in a grid stop lining up. The rest
// collapse into a "+N" chip, as on the asset card.
const VISIBLE_CHIPS = 4;

/**
 * A buyer, as a seller browses them — the mirror of `AssetCard`.
 *
 * A card rather than a table row because a mandate is chips plus prose, which a
 * table flattens into unreadable columns. Phase 7 hangs the match badge here,
 * the same way `AssetCard` carries one for the buyer side.
 *
 * Deliberately no email. The seller opens the conversation through an inquiry
 * and the buyer's address is revealed to them when they reply — the same shape
 * as the listing page, where a buyer sees a seller's company, not their inbox.
 */
export function BuyerCard({
  buyer,
  listQuery = "",
}: {
  buyer: BuyerCardData;
  /** The list's canonical query string, carried onto the profile URL so its
   *  back link restores the filters the seller actually had. */
  listQuery?: string;
}) {
  const who = buyer.companyName ?? buyer.name;
  const profile = buyer.buyerProfile;

  return (
    <Card className="group/buyer relative h-full transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring">
      <CardHeader>
        <CardTitle>
          {/* Stretched link over the whole card (anchored to the `relative`
              above), while the accessible name stays just the buyer. */}
          <Link
            href={`/seller/buyers/${buyer.id}${listQuery ? `?${listQuery}` : ""}`}
            className="line-clamp-2 outline-none after:absolute after:inset-0"
          >
            {who}
          </Link>
        </CardTitle>
        {buyer.companyName && (
          <p className="text-sm text-muted-foreground">{buyer.name}</p>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {profile ? (
          <>
            <ChipRow label="Industries" values={profile.industries} />
            <ChipRow label="Regions" values={profile.regions} />

            {profile.description && (
              <p className="line-clamp-3 text-sm text-muted-foreground">
                {profile.description}
              </p>
            )}
          </>
        ) : (
          // A real state, not missing data: a buyer with no profile is still
          // worth approaching, they just have not said what they are after. An
          // empty chip row would read as "interested in nothing".
          <p className="text-sm text-muted-foreground">
            Hasn&apos;t described their interests yet.
          </p>
        )}
      </CardContent>

      <CardFooter className="justify-between gap-2">
        <span className="shrink-0 text-xs text-muted-foreground">Budget</span>
        <span className="truncate text-sm font-semibold text-primary">
          {formatBudgetRange(
            profile?.budgetMin ?? null,
            profile?.budgetMax ?? null,
            { compact: true }
          )}
        </span>
      </CardFooter>
    </Card>
  );
}

function ChipRow({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) return null;

  const hidden = values.length - VISIBLE_CHIPS;

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <ul className="flex flex-wrap gap-1.5">
        {values.slice(0, VISIBLE_CHIPS).map((value) => (
          <li key={value}>
            <Badge variant="secondary">{value}</Badge>
          </li>
        ))}
        {hidden > 0 && (
          <li className="self-center text-xs text-muted-foreground">
            +{hidden} more
          </li>
        )}
      </ul>
    </div>
  );
}
