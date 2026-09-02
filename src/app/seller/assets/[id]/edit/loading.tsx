import { Skeleton } from "@/components/ui/skeleton";

export default function EditAssetLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto max-w-3xl space-y-6"
    >
      <span className="sr-only">Loading…</span>

      <Skeleton className="h-4 w-32" aria-hidden="true" />

      <div className="space-y-2" aria-hidden="true">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>

      <div className="space-y-4 rounded-xl border p-6" aria-hidden="true">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>

      <div className="space-y-4 rounded-xl border p-6" aria-hidden="true">
        <Skeleton className="h-5 w-24" />
        <div className="grid gap-5 sm:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
        <Skeleton className="h-24 w-full" />
      </div>

      <div className="space-y-4 rounded-xl border p-6" aria-hidden="true">
        <Skeleton className="h-5 w-32" />
        <div className="grid gap-5 sm:grid-cols-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>

      <div className="flex items-center gap-3" aria-hidden="true">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-20" />
      </div>
    </div>
  );
}
