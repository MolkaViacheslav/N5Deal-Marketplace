import { Badge } from "@/components/ui/badge";
import { businessStatusLabel, categoryLabel } from "@/lib/taxonomy";
import type { AssetCategory, BusinessStatus } from "@/generated/prisma/enums";

// `businessStatus` describes the company being sold, not the listing's
// moderation state — see CLAUDE.md → Naming note. A DORMANT company is a
// perfectly normal thing to buy (a dormant licence is half the market here),
// so it reads as neutral, not as a warning. Only IN_LIQUIDATION is red.
const BUSINESS_STATUS_VARIANT = {
  ACTIVE: "success",
  DORMANT: "secondary",
  IN_LIQUIDATION: "destructive",
} as const satisfies Record<BusinessStatus, string>;

export function BusinessStatusBadge({ status }: { status: BusinessStatus }) {
  return (
    <Badge variant={BUSINESS_STATUS_VARIANT[status]}>
      {businessStatusLabel(status)}
    </Badge>
  );
}

export function CategoryBadge({ category }: { category: AssetCategory }) {
  return <Badge variant="secondary">{categoryLabel(category)}</Badge>;
}

export function CountryBadge({ country }: { country: string }) {
  return <Badge variant="outline">{country}</Badge>;
}

/**
 * The badge row shared by the card and the detail header, so the two can never
 * drift into showing a different set.
 */
export function AssetBadges({
  category,
  businessStatus,
  country,
}: {
  category: AssetCategory;
  businessStatus: BusinessStatus;
  country: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <CategoryBadge category={category} />
      <BusinessStatusBadge status={businessStatus} />
      <CountryBadge country={country} />
    </div>
  );
}
