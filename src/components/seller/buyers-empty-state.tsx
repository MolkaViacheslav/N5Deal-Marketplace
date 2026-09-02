import Link from "next/link";
import { SearchX, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * The same two-state split as `components/buyer/assets-empty-state.tsx`, and for
 * the same reason: "your filters are too narrow" is the user's problem and has
 * an action, "there are no buyers" is ours and has none. Offering "Clear
 * filters" on an empty marketplace sends the seller in a circle.
 */
export function BuyersEmptyState({ isFiltered }: { isFiltered: boolean }) {
  const Icon = isFiltered ? SearchX : Users;

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <Icon className="size-8 text-muted-foreground" aria-hidden="true" />

        <div className="space-y-1">
          <p className="font-medium">
            {isFiltered ? "No buyers match these filters" : "No buyers yet"}
          </p>
          <p className="max-w-md text-sm text-muted-foreground">
            {isFiltered
              ? "Try a different industry or region, or raise the budget you are filtering on — a buyer who left a bound open counts as matching on that side."
              : "There are no active buyers on the marketplace right now. Check back shortly."}
          </p>
        </div>

        {isFiltered && (
          <Button asChild variant="outline" size="sm" className="mt-1">
            <Link href="/seller/buyers">Clear all filters</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
