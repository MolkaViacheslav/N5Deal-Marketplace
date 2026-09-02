import { Skeleton } from "@/components/ui/skeleton";

/** One `AssetCard`-shaped placeholder: badge row, title, price line, a 2-col
 *  fact grid, matching what the real card actually renders. */
function AssetCardSkeleton() {
  return (
    <div className="flex h-full flex-col gap-4 rounded-xl border p-6">
      <div className="space-y-2">
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-5 w-4/5" />
      </div>

      <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>

      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-6 w-24" />
      </div>
    </div>
  );
}

export default function BuyerAssetsLoading() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="space-y-6" aria-hidden="true">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {/* AI search bar */}
      <div className="space-y-3 rounded-xl border p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Manual filter bar */}
      <div className="space-y-3 rounded-xl border p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-full sm:w-52" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>

      <Skeleton className="h-4 w-24" />

      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i}>
            <AssetCardSkeleton />
          </li>
        ))}
      </ul>
      </div>
    </div>
  );
}
