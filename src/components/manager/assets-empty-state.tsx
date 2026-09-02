import Link from "next/link";
import { SearchX, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * The manager's mirror of `components/buyer/assets-empty-state.tsx`: a narrow
 * filter is the manager's own doing and has a way out, no listings on the
 * platform at all is not and has none.
 */
export function ManagerAssetsEmptyState({ isFiltered }: { isFiltered: boolean }) {
  const Icon = isFiltered ? SearchX : Store;

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <Icon className="size-8 text-muted-foreground" aria-hidden="true" />

        <div className="space-y-1">
          <p className="font-medium">
            {isFiltered ? "No assets match your filters" : "No assets yet"}
          </p>
          <p className="max-w-md text-sm text-muted-foreground">
            {isFiltered
              ? "Try a different category, country or status, or clear the search box."
              : "No listings have been published on the platform yet."}
          </p>
        </div>

        {isFiltered && (
          <Button asChild variant="outline" size="sm" className="mt-1">
            <Link href="/manager/assets">Clear all filters</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
