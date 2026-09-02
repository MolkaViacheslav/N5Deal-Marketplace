// Smart Matching — the whole rulebook, in one pure module.
//
// Deterministic and rule-based on purpose (CLAUDE.md → Smart Matching): a
// reviewer running the demo twice must see the same numbers, which an LLM
// scorer could not promise. It is called server-side at render time; at 18
// listings there is nothing to precompute and no job to schedule.
//
// Nothing here imports Prisma, React or `@/…`. The input types are declared
// structurally, so a full `BuyerProfile` / `Asset` row satisfies them without a
// cast while the module itself stays testable with plain object literals — the
// same trick `AssetCardData` and `BuyerCardData` use for their own reasons.

/** Points per component. They sum to 100; nothing else may claim any. */
export const MATCH_WEIGHTS = { region: 35, industry: 35, budget: 30 } as const;

export const MAX_MATCH_SCORE =
  MATCH_WEIGHTS.region + MATCH_WEIGHTS.industry + MATCH_WEIGHTS.budget;

/**
 * The bar for "Recommended for you". Deliberately above a single 35-point
 * component and below two of them: a listing has to satisfy at least region +
 * industry, or one of those plus the budget, before it is put in front of a
 * buyer as a recommendation.
 */
export const RECOMMENDED_MIN_SCORE = 60;

/** What matching needs from a `BuyerProfile`. */
export type MatchProfile = {
  industries: string[];
  regions: string[];
  budgetMin: number | null;
  budgetMax: number | null;
};

/** What matching needs from an `Asset`. */
export type MatchAsset = {
  country: string;
  industry: string;
  askingPrice: number;
};

/**
 * How well one listing fits one buyer's mandate, as an integer 0–100.
 *
 * The three components are independent and additive — there is no weighting
 * beyond the constants above, and no partial credit inside a component.
 *
 * The rule that drives every edge case: **a criterion the buyer did not state
 * scores zero, never a wildcard.** An empty `regions`, an empty `industries` or
 * a budget with neither bound is silence, not "anything goes". Read the other
 * way round, an empty profile would score 100% against every listing in the
 * marketplace — which is exactly the answer the no-profile prompt exists to
 * avoid giving.
 */
export function computeMatchScore(
  profile: MatchProfile,
  asset: MatchAsset
): number {
  let score = 0;

  if (matchesRegion(profile, asset)) score += MATCH_WEIGHTS.region;
  if (matchesIndustry(profile, asset)) score += MATCH_WEIGHTS.industry;
  if (matchesBudget(profile, asset)) score += MATCH_WEIGHTS.budget;

  return score;
}

/**
 * Exact string comparison, not a case- or whitespace-tolerant one: both sides
 * come from the closed vocabularies in `taxonomy.ts` (`REGIONS` is literally
 * `COUNTRIES`), and the seed refuses to write a value that isn't in them. A
 * fuzzy compare here would only hide the day that stops being true.
 */
function matchesRegion(profile: MatchProfile, asset: MatchAsset): boolean {
  return profile.regions.includes(asset.country);
}

function matchesIndustry(profile: MatchProfile, asset: MatchAsset): boolean {
  return profile.industries.includes(asset.industry);
}

/**
 * An absent bound is open-ended on that side, not zero — the same asymmetry
 * `buildBuyerWhere` in `app/seller/buyers/filters.ts` applies to its budget
 * filter, and the two must agree or the seller's list and the seller's badges
 * would disagree about the same buyer.
 *
 * Both bounds absent is the one case that is *not* open-ended: it means the
 * buyer never stated a budget, so there is nothing to score.
 */
function matchesBudget(profile: MatchProfile, asset: MatchAsset): boolean {
  const { budgetMin, budgetMax } = profile;

  if (budgetMin === null && budgetMax === null) return false;
  if (budgetMin !== null && asset.askingPrice < budgetMin) return false;
  if (budgetMax !== null && asset.askingPrice > budgetMax) return false;

  return true;
}

/**
 * The best a buyer scores against a whole inventory — the seller's side of the
 * same question, where the answer is "how well does this buyer fit *anything*
 * I am selling?".
 *
 * `undefined`, not `0`, when there is nothing to score against: a seller with
 * no listings has no basis for a badge, and "0% match" would be a claim rather
 * than an absence. Every card in the app treats an absent score the same way.
 */
export function bestMatchScore(
  profile: MatchProfile,
  assets: MatchAsset[]
): number | undefined {
  let best: number | undefined;

  for (const asset of assets) {
    const score = computeMatchScore(profile, asset);
    if (best === undefined || score > best) best = score;
  }

  return best;
}

/**
 * Comparator for a "Best match" sort: highest first, unscored last.
 *
 * Fed to `Array.prototype.sort`, which is stable, so equal scores keep whatever
 * order the database already put them in — newest first on both screens. That
 * is what makes the JS re-sort a refinement of the SQL ordering rather than a
 * replacement for it.
 */
export function compareByMatchDesc(
  a: number | undefined,
  b: number | undefined
): number {
  if (a === b) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return b - a;
}
