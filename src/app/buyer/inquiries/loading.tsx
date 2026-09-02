import { InquiryCardSkeleton } from "@/components/inquiry/inquiry-card-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function BuyerInquiriesLoading() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="mx-auto max-w-3xl space-y-6" aria-hidden="true">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="flex gap-1 border-b pb-px">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
      </div>

      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <InquiryCardSkeleton key={i} />
        ))}
      </div>
      </div>
    </div>
  );
}
