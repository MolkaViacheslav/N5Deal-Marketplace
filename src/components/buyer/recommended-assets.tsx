import { AssetCard, type AssetCardData } from "@/components/asset/asset-card";
import { RECOMMENDED_MIN_SCORE } from "@/lib/matching";

export type RecommendedAsset = AssetCardData & { matchScore: number };

/**
 * The "Recommended for you" strip above buyer browse.
 *
 * Purely presentational: it decides nothing about *which* listings qualify —
 * the page does that, because the threshold and the ordering are matching
 * rules, not layout. All this owns is "if there is nothing to recommend, do not
 * announce an empty section".
 *
 * The cards are the same `AssetCard` as the grid below, deliberately: a
 * recommendation is not a different kind of listing, and a bespoke card here
 * would be the second thing to update every time the first one changes.
 */
export function RecommendedAssets({ assets }: { assets: RecommendedAsset[] }) {
  if (assets.length === 0) return null;

  return (
    <section aria-labelledby="recommended-heading" className="space-y-3">
      <div className="space-y-1">
        <h2 id="recommended-heading" className="text-lg font-semibold">
          Recommended for you
        </h2>
        <p className="text-sm text-muted-foreground">
          Scoring {RECOMMENDED_MIN_SCORE}% or higher against your profile.
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {assets.map((asset) => (
          <li key={asset.id}>
            <AssetCard asset={asset} matchScore={asset.matchScore} />
          </li>
        ))}
      </ul>
    </section>
  );
}
