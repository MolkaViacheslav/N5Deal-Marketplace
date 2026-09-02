import type { Metadata } from "next";

import { NotFoundState } from "@/components/layout/not-found-state";

export const metadata: Metadata = { title: "Not found" };

// Reached when `/seller/buyers/[id]` or `/seller/assets/[id]/edit` call
// `notFound()` (a suspended buyer, or a listing that isn't the seller's own —
// CLAUDE.md: indistinguishable from one that never existed), and — via the
// `[...notFound]` catch-all route next to this file — for any other mistyped
// URL under `/seller` too. See the comment there for why the catch-all is
// needed at all. Renders inside `AppShell`.
export default function SellerNotFound() {
  return (
    <NotFoundState
      title="Not found"
      description="That buyer or listing isn't available, or the link is wrong."
      href="/seller/assets"
      label="Go to my listings"
    />
  );
}
