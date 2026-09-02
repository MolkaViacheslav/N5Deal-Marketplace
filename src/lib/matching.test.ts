import { describe, expect, it } from "vitest";

import {
  bestMatchScore,
  compareByMatchDesc,
  computeMatchScore,
  MATCH_WEIGHTS,
  type MatchAsset,
  type MatchProfile,
} from "@/lib/matching";

// Builders rather than shared fixtures: every test states only the field it is
// about, and the baseline below is deliberately a *full* match, so a partial
// case is expressed by breaking exactly one thing.
const aProfile = (overrides: Partial<MatchProfile> = {}): MatchProfile => ({
  industries: ["Fintech", "Payments"],
  regions: ["Ireland", "Portugal"],
  budgetMin: 200_000,
  budgetMax: 3_000_000,
  ...overrides,
});

const anAsset = (overrides: Partial<MatchAsset> = {}): MatchAsset => ({
  country: "Ireland",
  industry: "Fintech",
  askingPrice: 1_000_000,
  ...overrides,
});

const { region, industry, budget } = MATCH_WEIGHTS;

describe("computeMatchScore", () => {
  it("scores 100 when region, industry and budget all match", () => {
    expect(computeMatchScore(aProfile(), anAsset())).toBe(100);
  });

  it("scores 0 when nothing overlaps", () => {
    const score = computeMatchScore(
      aProfile(),
      anAsset({ country: "Malta", industry: "Healthcare", askingPrice: 50_000 })
    );

    expect(score).toBe(0);
  });

  it("scores the region component alone", () => {
    const score = computeMatchScore(
      aProfile(),
      anAsset({ industry: "Healthcare", askingPrice: 50_000 })
    );

    expect(score).toBe(region);
  });

  it("scores the industry component alone", () => {
    const score = computeMatchScore(
      aProfile(),
      anAsset({ country: "Malta", askingPrice: 50_000 })
    );

    expect(score).toBe(industry);
  });

  it("scores the budget component alone", () => {
    const score = computeMatchScore(
      aProfile(),
      anAsset({ country: "Malta", industry: "Healthcare" })
    );

    expect(score).toBe(budget);
  });

  // The whole point of the design: silence is not a wildcard. A buyer who
  // stated nothing must not come out as a 100% match for the entire market.
  it("treats empty regions and industries as no match, not as a wildcard", () => {
    const score = computeMatchScore(
      aProfile({ industries: [], regions: [] }),
      anAsset()
    );

    expect(score).toBe(budget);
  });

  it("scores no budget points when neither bound is set", () => {
    const score = computeMatchScore(
      aProfile({ budgetMin: null, budgetMax: null }),
      anAsset()
    );

    expect(score).toBe(region + industry);
  });

  it("treats a null budgetMin as an open lower bound", () => {
    const profile = aProfile({ budgetMin: null, budgetMax: 3_000_000 });

    expect(computeMatchScore(profile, anAsset({ askingPrice: 1 }))).toBe(100);
    expect(computeMatchScore(profile, anAsset({ askingPrice: 3_000_001 }))).toBe(
      region + industry
    );
  });

  it("treats a null budgetMax as an open upper bound", () => {
    const profile = aProfile({ budgetMin: 200_000, budgetMax: null });

    expect(
      computeMatchScore(profile, anAsset({ askingPrice: 99_000_000 }))
    ).toBe(100);
    expect(computeMatchScore(profile, anAsset({ askingPrice: 199_999 }))).toBe(
      region + industry
    );
  });

  // Both bounds are inclusive. A buyer who wrote "up to €3M" means €3M is fine.
  it("counts a price exactly on the lower bound", () => {
    const score = computeMatchScore(
      aProfile({ budgetMin: 200_000, budgetMax: 3_000_000 }),
      anAsset({ country: "Malta", industry: "Healthcare", askingPrice: 200_000 })
    );

    expect(score).toBe(budget);
  });

  it("counts a price exactly on the upper bound", () => {
    const score = computeMatchScore(
      aProfile({ budgetMin: 200_000, budgetMax: 3_000_000 }),
      anAsset({
        country: "Malta",
        industry: "Healthcare",
        askingPrice: 3_000_000,
      })
    );

    expect(score).toBe(budget);
  });

  // Nothing validates min <= max at the profile level, so an inverted range has
  // to mean "no price satisfies this" rather than quietly reading as open.
  it("satisfies no price when the range is inverted", () => {
    const score = computeMatchScore(
      aProfile({ budgetMin: 3_000_000, budgetMax: 200_000 }),
      anAsset()
    );

    expect(score).toBe(region + industry);
  });
});

describe("bestMatchScore", () => {
  it("returns the highest score across the inventory", () => {
    const score = bestMatchScore(aProfile(), [
      anAsset({ country: "Malta", industry: "Healthcare" }), // 30
      anAsset({ industry: "Healthcare" }), // 65
      anAsset({ country: "Malta", askingPrice: 50_000 }), // 35
    ]);

    expect(score).toBe(region + budget);
  });

  it("returns undefined for an empty inventory", () => {
    expect(bestMatchScore(aProfile(), [])).toBeUndefined();
  });
});

describe("compareByMatchDesc", () => {
  it("sorts higher scores first and unscored entries last", () => {
    const sorted = [40, undefined, 100, 0].sort(compareByMatchDesc);

    expect(sorted).toEqual([100, 40, 0, undefined]);
  });
});
