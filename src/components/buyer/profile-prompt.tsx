import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

/**
 * The no-profile fallback for buyer browse (CLAUDE.md → Smart Matching).
 *
 * Shown *instead of* match badges, never alongside them: a buyer who has not
 * said what they are looking for cannot be scored, and a row of "0% match"
 * badges would state something false about the marketplace rather than
 * something true about the empty profile.
 *
 * Visually the same card as the prompt on `/buyer/profile` itself — one
 * invitation to one action, so a buyer who bounces between the two screens
 * sees a single message rather than two competing ones.
 */
export function ProfilePrompt() {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex items-start gap-3">
        <Sparkles
          className="mt-0.5 size-5 shrink-0 text-primary"
          aria-hidden="true"
        />
        <p className="text-sm">
          Complete your profile to see match scores.{" "}
          <Link
            href="/buyer/profile"
            className="font-medium text-primary underline underline-offset-4"
          >
            Tell us which industries, regions and budget you are after
          </Link>{" "}
          and every listing will be scored against it.
        </p>
      </CardContent>
    </Card>
  );
}
