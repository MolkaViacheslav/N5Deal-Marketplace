import { Skeleton } from "@/components/ui/skeleton";

/** One `BuyerCard`-shaped placeholder: title + match badge, two chip rows, a
 *  description line, and a budget footer, matching the real card. */
function BuyerCardSkeleton() {
  return (
    <div className="flex h-full flex-col gap-4 rounded-xl border p-6">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>

      <div className="flex-1 space-y-3">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-16" />
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-12" />
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

export default function SellerBuyersLoading() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="space-y-6" aria-hidden="true">
      <div className="space-y-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-9 w-40" />
      </div>

      <Skeleton className="h-4 w-20" />

      <ul className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i}>
            <BuyerCardSkeleton />
          </li>
        ))}
      </ul>
      </div>
    </div>
  );
}
