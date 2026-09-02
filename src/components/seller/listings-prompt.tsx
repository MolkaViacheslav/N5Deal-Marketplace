import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

/**
 * The seller's half of the no-data fallback, mirroring `ProfilePrompt` on buyer
 * browse.
 *
 * A buyer is scored against what this seller has published; with an empty
 * inventory there is nothing to score, so the badges and the "Best match" sort
 * are absent. Without this card that absence looks like a feature that broke —
 * particularly for a reviewer who has just read about matching in the README.
 */
export function ListingsPrompt() {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex items-start gap-3">
        <Sparkles
          className="mt-0.5 size-5 shrink-0 text-primary"
          aria-hidden="true"
        />
        <p className="text-sm">
          Publish a listing to see how well these buyers match it.{" "}
          <Link
            href="/seller/assets/new"
            className="font-medium text-primary underline underline-offset-4"
          >
            Add your first listing
          </Link>{" "}
          and every buyer will be scored against it.
        </p>
      </CardContent>
    </Card>
  );
}
