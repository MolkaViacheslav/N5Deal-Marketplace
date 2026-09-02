import { Skeleton } from "@/components/ui/skeleton";

export default function BuyerProfileDetailLoading() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="space-y-6" aria-hidden="true">
      <Skeleton className="h-4 w-24" />

      <header className="space-y-1.5">
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-4 w-40" />
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-6">
          <section className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </section>

          <section className="space-y-3">
            <Skeleton className="h-4 w-36" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </section>

          <section className="space-y-3">
            <Skeleton className="h-4 w-16" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </section>

          <section className="space-y-3">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </section>
        </div>

        <div className="space-y-4 rounded-xl border p-6">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
      </div>
    </div>
  );
}
