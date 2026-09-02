import { notFound } from "next/navigation";

// A catch-all for anything under `/buyer` that isn't a real route.
//
// Next only invokes a segment's own `not-found.tsx` for an explicit
// `notFound()` call from within that segment's rendered tree — a URL that
// matches no route at all skips straight to the root `app/not-found.tsx`
// (confirmed: `next build`'s route list shows exactly one static
// `/_not-found`). This catch-all gives `/buyer/<typo>` a route to match so it
// *does* render inside `buyer/layout.tsx`, and then hands off to
// `buyer/not-found.tsx` immediately.
export default function BuyerCatchAll() {
  notFound();
}
