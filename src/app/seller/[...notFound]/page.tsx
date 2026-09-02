import { notFound } from "next/navigation";

// See src/app/buyer/[...notFound]/page.tsx for why this exists: without it,
// a mistyped URL under `/seller` skips seller/not-found.tsx entirely and
// falls through to the root one, outside AppShell.
export default function SellerCatchAll() {
  notFound();
}
