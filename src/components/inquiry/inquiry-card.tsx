import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/taxonomy";

/**
 * One inquiry, for either role.
 *
 * This was two near-identical files (`components/{buyer,seller}/inquiry-card`)
 * until Phase 7's consistency pass. They differed in exactly one thing — where
 * a listing link points — because `/buyer/assets/[id]` is a route
 * `requireRole("BUYER")` would bounce a seller out of, and a seller's own
 * listing belongs on their edit screen. That difference is now a prop.
 */
export type InquiryCardData = {
  id: string;
  message: string;
  createdAt: Date;
  counterparty: { name: string; email: string; companyName: string | null };
  asset: { id: string; title: string } | null;
};

export function InquiryCard({
  inquiry,
  direction,
  assetHref,
}: {
  inquiry: InquiryCardData;
  direction: "sent" | "received";
  /** Where this role's listing link points. A function rather than a base path
   *  because the two are not the same shape — `/buyer/assets/[id]` against
   *  `/seller/assets/[id]/edit`. Both callers are Server Components, so it
   *  never crosses a client boundary. */
  assetHref: (assetId: string) => string;
}) {
  const { counterparty, asset } = inquiry;
  const who = counterparty.companyName ?? counterparty.name;

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <div className="min-w-0">
            <p className="font-medium">
              <span className="text-muted-foreground">
                {direction === "sent" ? "To " : "From "}
              </span>
              {who}
            </p>
            {/* The reply channel. There is no in-app thread — an Inquiry is one
                message — so the address is not a detail, it is how the
                conversation continues at all. */}
            <a
              href={`mailto:${counterparty.email}`}
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {counterparty.email}
            </a>
          </div>
          <time
            dateTime={inquiry.createdAt.toISOString()}
            className="text-xs text-muted-foreground"
          >
            {formatWhen(inquiry.createdAt)}
          </time>
        </div>

        {asset ? (
          <Link
            href={assetHref(asset.id)}
            className="inline-block text-sm text-primary underline-offset-4 hover:underline"
          >
            {asset.title}
          </Link>
        ) : (
          // `Inquiry.assetId` is nullable because a seller can approach a buyer
          // off the back of their profile rather than a specific listing — which
          // is every inquiry a seller *sends*. A real state, not missing data,
          // so it gets a label of its own.
          <Badge variant="outline">General enquiry — no listing</Badge>
        )}

        <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {inquiry.message}
        </p>
      </CardContent>
    </Card>
  );
}

const RELATIVE = new Intl.RelativeTimeFormat("en-IE", { numeric: "auto" });

/**
 * Relative for the first week, absolute after that — "13 days ago" is harder
 * to place than a date, and beyond a month it stops meaning anything at all.
 *
 * Computed on the server, so it is the render time that anchors it. At this
 * scale that's fine; a long-lived tab would need a client component to keep
 * ticking, which is not worth a dependency here.
 */
function formatWhen(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.round(diffMs / 3_600_000);

  if (diffHours < 1) return "just now";
  if (diffHours < 24) return RELATIVE.format(-diffHours, "hour");

  const diffDays = Math.round(diffHours / 24);
  if (diffDays <= 7) return RELATIVE.format(-diffDays, "day");

  return formatDate(date);
}
