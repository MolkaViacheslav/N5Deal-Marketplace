import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * The one place a match score turns into a colour.
 *
 * Lifted out of `asset-card.tsx` in Phase 7 because both sides of the
 * marketplace show the same number — a buyer scoring a listing, a seller
 * scoring a buyer — and two copies of the banding is how one of them ends up
 * corrected on its own (the same reasoning behind `ModerationStatusBadge`
 * covering two separate enums with one look).
 *
 * Traffic-light banding on the score. The theme has `success` and `destructive`
 * tokens but no amber one, so the middle band names Tailwind's amber directly
 * instead of inventing a token; if a `--warning` token is ever added, this is
 * the only place that changes.
 */
export function MatchBadge({
  score,
  context,
}: {
  score: number;
  /**
   * What the score was measured against, as a phrase completing
   * "<n>% match …" — e.g. "against your buyer profile". Required: the number
   * alone means nothing, and the phrase differs per role.
   *
   * A phrase rather than a finished sentence so this component owns the one
   * copy of the wording, and the two call sites cannot drift into saying it
   * differently in the tooltip and in the accessible name.
   */
  context: string;
}) {
  const tone =
    score >= 70
      ? { variant: "success" as const, className: undefined }
      : score >= 40
        ? {
            variant: "secondary" as const,
            className:
              "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
          }
        : { variant: "destructive" as const, className: undefined };

  return (
    <Badge
      variant={tone.variant}
      // `relative z-10` is load-bearing, not decoration. Both cards that render
      // this are stretched-link cards: the title's `after:absolute after:inset-0`
      // covers the whole card, and a positioned element always paints over a
      // static one, so an unpositioned badge sits *underneath* that overlay.
      // The pointer then lands on the link and the tooltip can never fire —
      // verified with `elementFromPoint`, which returned the `<a>` rather than
      // this badge. Raising it costs the badge's own area as a click target for
      // opening the card, which is the right trade for making the only piece of
      // explanation on the card actually reachable.
      className={cn("relative z-10 shrink-0", tone.className)}
      title={`${score}% match ${context}`}
    >
      {score}% match
      {/* `title` is mouse-only: it is not surfaced to keyboard users and is read
          unreliably by screen readers. The same phrase goes into the accessible
          name so "65% match" is not the whole story for anyone who cannot
          hover. */}
      <span className="sr-only"> {context}</span>
    </Badge>
  );
}
