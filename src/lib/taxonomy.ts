// Single source of truth for the closed vocabularies used by listings.
//
// WHY a module and not DB tables: countries and industries are a fixed
// vocabulary for this prototype — they are never edited by users and never
// queried on their own. Keeping them as string columns constrained by these
// lists avoids two joins on the hottest query (buyer browse) at the cost of
// referential integrity we don't need here. If the marketplace ever needed
// per-industry metadata, they'd become tables.
//
// The seed, the filter bar, the asset form and the buyer profile form all read
// from here, so they can never drift apart.

export const COUNTRIES = [
  "Ireland",
  "Portugal",
  "Estonia",
  "Lithuania",
  "Cyprus",
  "Malta",
  "Germany",
  "Netherlands",
  "Spain",
  "Poland",
] as const;

export type Country = (typeof COUNTRIES)[number];

export const INDUSTRIES = [
  "Fintech",
  "Payments",
  "Crypto & Digital Assets",
  "Insurance",
  "Lending",
  "Wealth Management",
  "SaaS",
  "Logistics",
  "Healthcare",
  "Renewable Energy",
  "iGaming",
  "Real Estate",
] as const;

export type Industry = (typeof INDUSTRIES)[number];

// Regions a Buyer can express interest in. Deliberately the same vocabulary as
// COUNTRIES: matching compares `asset.country` against `profile.regions`
// directly, so a broader "region" concept (EU / Nordics / DACH) would need a
// country→region mapping that buys nothing at this scale. Named `regions`
// because that is the word the brief uses.
export const REGIONS = COUNTRIES;

export const ASSET_CATEGORIES = [
  { value: "LICENSE", label: "License" },
  { value: "OPERATING_BUSINESS", label: "Operating Business" },
  { value: "STAKE", label: "Stake" },
] as const;

export const BUSINESS_STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "DORMANT", label: "Dormant" },
  { value: "IN_LIQUIDATION", label: "In liquidation" },
] as const;

const labelOf = <T extends readonly { value: string; label: string }[]>(
  list: T,
  value: string
) => list.find((item) => item.value === value)?.label ?? value;

export const categoryLabel = (value: string) => labelOf(ASSET_CATEGORIES, value);
export const businessStatusLabel = (value: string) =>
  labelOf(BUSINESS_STATUSES, value);

// Money is stored as whole EUR integers (CLAUDE.md pitfall 3). This is the one
// place it becomes a string.
const eur = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export const formatEur = (amount: number) => eur.format(amount);

// Compact form for cards and badges: €1.2M, €450K.
export function formatEurCompact(amount: number): string {
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    const digits = millions < 10 && millions % 1 !== 0 ? 1 : 0;
    return `€${millions.toFixed(digits)}M`;
  }
  if (amount >= 1_000) return `€${Math.round(amount / 1_000)}K`;
  return eur.format(amount);
}
