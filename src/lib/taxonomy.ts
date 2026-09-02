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

// `UserStatus` and `ListingStatus` are separate Prisma enums with identical
// members, because a participant and a listing are moderated independently —
// but they are one vocabulary to a reader, and the manager's two tables, the
// two filter bars and (Phase 5) the seller's own listings table would
// otherwise each carry their own copy of these three labels.
export const MODERATION_STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "REMOVED", label: "Removed" },
] as const;

export type ModerationStatus = (typeof MODERATION_STATUSES)[number]["value"];

const labelOf = <T extends readonly { value: string; label: string }[]>(
  list: T,
  value: string
) => list.find((item) => item.value === value)?.label ?? value;

export const categoryLabel = (value: string) => labelOf(ASSET_CATEGORIES, value);
export const businessStatusLabel = (value: string) =>
  labelOf(BUSINESS_STATUSES, value);
export const moderationStatusLabel = (value: string) =>
  labelOf(MODERATION_STATUSES, value);

// ---------------------------------------------------------------------------
// Display formatters. They live here, next to the vocabularies, because the
// question they answer is the same one: "how is this value written down in
// this app?" — and having exactly one answer is the point.
//
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

// Dates are formatted on the server, and a Vercel function is not pinned to
// one region — leave the time zone out and the same timestamp renders as a
// different day depending on which machine served the request. Pinned to the
// marketplace's own zone so every screen agrees, and so a reviewer comparing
// two tables never sees the same row dated a day apart.
const TIME_ZONE = "Europe/Dublin";

const date = new Intl.DateTimeFormat("en-IE", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTime = new Intl.DateTimeFormat("en-IE", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatDate = (value: Date) => date.format(value);
export const formatDateTime = (value: Date) => dateTime.format(value);
