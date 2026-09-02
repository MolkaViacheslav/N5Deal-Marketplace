import { Badge } from "@/components/ui/badge";
import { moderationStatusLabel, type ModerationStatus } from "@/lib/taxonomy";

// Suspended is deliberately neutral rather than a warning colour: it is a
// reversible hold, and a table where half the rows shout is a table nobody
// reads. Removed is the terminal one, so it gets the red.
const VARIANT = {
  ACTIVE: "success",
  SUSPENDED: "secondary",
  REMOVED: "destructive",
} as const satisfies Record<ModerationStatus, string>;

/**
 * The moderation state of a participant or a listing.
 *
 * One component for both because `UserStatus` and `ListingStatus` are the same
 * three states with the same meaning — separate Prisma enums only because the
 * two are moderated independently. Two lookalike badge maps is how the
 * participants table and the listings table start disagreeing about what
 * "Suspended" looks like.
 */
export function ModerationStatusBadge({ status }: { status: ModerationStatus }) {
  return <Badge variant={VARIANT[status]}>{moderationStatusLabel(status)}</Badge>;
}
