import Link from "next/link";
import { SearchX, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * The same two-state split as `components/buyer/assets-empty-state.tsx` and
 * `components/seller/buyers-empty-state.tsx`: a narrow filter is the manager's
 * own doing and has a way out, an empty platform is not and has none.
 */
export function ManagerParticipantsEmptyState({ isFiltered }: { isFiltered: boolean }) {
  const Icon = isFiltered ? SearchX : Users;

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <Icon className="size-8 text-muted-foreground" aria-hidden="true" />

        <div className="space-y-1">
          <p className="font-medium">
            {isFiltered
              ? "No participants match your filters"
              : "No participants yet"}
          </p>
          <p className="max-w-md text-sm text-muted-foreground">
            {isFiltered
              ? "Try a different role or status, or clear the search box."
              : "No buyers or sellers have signed up yet."}
          </p>
        </div>

        {isFiltered && (
          <Button asChild variant="outline" size="sm" className="mt-1">
            <Link href="/manager/participants">Clear all filters</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
