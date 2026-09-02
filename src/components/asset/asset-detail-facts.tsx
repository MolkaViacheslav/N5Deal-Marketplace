import {
  categoryFacts,
  CATEGORY_SECTION_TITLE,
  type CategoryFieldsData,
} from "@/components/asset/asset-category-fields";
import { cn } from "@/lib/utils";

/**
 * The category-specific block on the listing detail page. Which fields belong
 * to which category is decided in `asset-category-fields.ts`, shared with the
 * asset card; this component only lays them out.
 *
 * Note it reads only the fields belonging to `category`. A listing edited from
 * LICENSE to STAKE has its old `regulatoryBody` nulled by
 * `sanitizeByCategory()` on the write, but even if that were ever missed, the
 * stale value is unreachable from here.
 */
export function AssetDetailFacts({ asset }: { asset: CategoryFieldsData }) {
  const facts = categoryFacts(asset);
  if (facts.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        {CATEGORY_SECTION_TITLE[asset.category]}
      </h2>
      <dl className="grid gap-4 sm:grid-cols-2">
        {facts.map((fact) => (
          <div
            key={fact.label}
            className={cn(
              "rounded-lg border bg-card p-3",
              // Free text gets the full row here too — a reason for sale can
              // run to a couple of sentences and reads badly in a half column.
              fact.wide && "sm:col-span-2"
            )}
          >
            <dt className="text-xs text-muted-foreground">{fact.label}</dt>
            <dd className="mt-0.5 font-medium">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
