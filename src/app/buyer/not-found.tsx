import type { Metadata } from "next";

import { NotFoundState } from "@/components/layout/not-found-state";

export const metadata: Metadata = { title: "Not found" };

// Reached when a listing's `notFound()` fires (moderated away, or never
// existed — CLAUDE.md: the two must be indistinguishable), and — via the
// `[...notFound]` catch-all route next to this file — for any other mistyped
// URL under `/buyer` too. Without that catch-all, an unmatched path has no
// segment tree to render at all and Next skips straight to the root
// `app/not-found.tsx`, outside `AppShell`; nested not-found.tsx files only
// ever fire on an explicit `notFound()` call. Renders inside `AppShell`.
export default function BuyerNotFound() {
  return (
    <NotFoundState
      title="Listing not found"
      description="It may have been moderated, withdrawn, or the link is wrong."
      href="/buyer/assets"
      label="Browse listings"
    />
  );
}
