import Link from "next/link";
import { SearchX, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Two genuinely different situations, deliberately not collapsed into one
 * message: "your filters are too narrow" is the user's problem and has an
 * action, "there is nothing listed" is ours and has none. Offering "Clear
 * filters" on an empty marketplace would send the user in a circle.
 */
export function AssetsEmptyState({ isFiltered }: { isFiltered: boolean }) {
  const Icon = isFiltered ? SearchX : Store;

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <Icon className="size-8 text-muted-foreground" aria-hidden="true" />

        <div className="space-y-1">
          <p className="font-medium">
            {isFiltered ? "No listings match these filters" : "No listings yet"}
          </p>
          <p className="max-w-md text-sm text-muted-foreground">
            {isFiltered
              ? "Try widening the price range, or clearing a filter or two."
              : "There are no active listings on the marketplace right now. Check back shortly."}
          </p>
        </div>

        {isFiltered && (
          <Button asChild variant="outline" size="sm" className="mt-1">
            <Link href="/buyer/assets">Clear all filters</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
