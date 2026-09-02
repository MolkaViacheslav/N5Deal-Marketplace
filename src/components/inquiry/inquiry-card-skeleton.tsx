import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder for one `InquiryCard`, shaped to match it: a name/email block
 * on the left, a timestamp on the right, a listing-link line, then a couple of
 * message lines. Shared by both `buyer/inquiries/loading.tsx` and
 * `seller/inquiries/loading.tsx` — the two routes render the same card shape,
 * just with different data behind it.
 */
export function InquiryCardSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3.5 w-32" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-4 w-48" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-5/6" />
        </div>
      </CardContent>
    </Card>
  );
}
