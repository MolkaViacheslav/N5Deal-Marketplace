// Which columns belong to which category, in one place.
//
// The card and the detail page both surface the category-specific block, and
// both previously carried their own `switch (category)`. Two copies of that is
// how a field ends up rendered on one surface and quietly missing from the
// other — so the knowledge lives here and the two differ only in presentation.
//
// All of these columns are nullable at the DB level: Prisma cannot express
// "required only when category = X", so the guarantee lives in the Zod
// discriminated union on the write path (CLAUDE.md → Asset validation). Read
// side therefore treats every one as genuinely optional and omits a row it has
// no value for, rather than printing "—" for data a valid listing always has.

import { formatEur, formatEurCompact } from "@/lib/taxonomy";
import type { AssetCategory } from "@/generated/prisma/enums";

export type CategoryFieldsData = {
  category: AssetCategory;
  regulatoryBody: string | null;
  licenseType: string | null;
  annualRevenue: number | null;
  reasonForSale: string | null;
  stakePercentage: number | null;
};

export const CATEGORY_SECTION_TITLE = {
  LICENSE: "Licence details",
  OPERATING_BUSINESS: "Business details",
  STAKE: "Stake details",
} as const satisfies Record<AssetCategory, string>;

export type CategoryFact = {
  label: string;
  value: string;
  /**
   * Free text rather than a short scalar, so it needs the full width of the
   * grid. A regulator's name or a reason for sale squeezed into a half-column
   * truncates to a useless fragment — "Owners retiring; no succe…" — while a
   * percentage or a money figure never does.
   */
  wide?: boolean;
};

/**
 * @param compact Card grids get `€6.1M`; the detail page, where there is room
 *   and the figure is being scrutinised rather than scanned, gets `€6,100,000`.
 */
export function categoryFacts(
  asset: CategoryFieldsData,
  { compact = false }: { compact?: boolean } = {}
): CategoryFact[] {
  const money = (amount: number | null) =>
    amount === null ? null : compact ? formatEurCompact(amount) : formatEur(amount);

  switch (asset.category) {
    case "LICENSE":
      return present([
        ["Regulatory body", asset.regulatoryBody, true],
        ["Licence type", asset.licenseType, true],
      ]);

    case "OPERATING_BUSINESS":
      return present([
        ["Annual revenue", money(asset.annualRevenue)],
        ["Reason for sale", asset.reasonForSale, true],
      ]);

    case "STAKE":
      return present([
        [
          "Stake offered",
          asset.stakePercentage === null ? null : `${asset.stakePercentage}%`,
        ],
        // Optional here and only here: a pre-revenue stake sale legitimately
        // has no revenue figure, and the seed contains one to prove it.
        ["Annual revenue", money(asset.annualRevenue)],
      ]);
  }
}

type Entry = [label: string, value: string | null, wide?: boolean];

const present = (entries: Entry[]): CategoryFact[] =>
  entries
    .filter((entry): entry is [string, string, boolean?] => Boolean(entry[1]))
    .map(([label, value, wide]) => ({ label, value, wide }));
