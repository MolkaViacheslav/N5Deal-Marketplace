// How a buyer's budget range is written down, in one place.
//
// The buyer card and the buyer profile page both render this range, and both
// previously carried their own four-branch version of it. Two copies of the
// same rule is how "an absent bound is open-ended" gets corrected on one
// surface and quietly left wrong on the other — the same reasoning that put
// `categoryFacts()` in `components/asset/asset-category-fields.ts`, and this
// module deliberately mirrors its `{ compact }` shape.
//
// The rule itself matters beyond formatting: a null bound means "no limit on
// that side", not zero. `app/seller/buyers/filters.ts` filters on exactly that
// reading, and Phase 7's `computeMatchScore` is specified to score an
// open-ended bound as satisfied on its side — so all three have to agree about
// what a half-filled budget means.

import { formatEur, formatEurCompact } from "@/lib/taxonomy";

/**
 * @param compact Cards get `€2M – €15M`; the profile page, where there is room
 *   and the figure is being scrutinised rather than scanned, gets the full
 *   `€2,000,000 – €15,000,000`.
 */
export function formatBudgetRange(
  min: number | null,
  max: number | null,
  { compact = false }: { compact?: boolean } = {}
): string {
  const money = compact ? formatEurCompact : formatEur;

  if (min === null && max === null) return "Not stated";
  if (min === null) return `Up to ${money(max!)}`;
  if (max === null) return `From ${money(min)}`;
  return `${money(min)} – ${money(max)}`;
}
