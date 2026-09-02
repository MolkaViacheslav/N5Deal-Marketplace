import type { Metadata } from "next";

import { NotFoundState } from "@/components/layout/not-found-state";

export const metadata: Metadata = { title: "Not found" };

// Manager has no `[id]` detail routes, so this is only ever reached via the
// `[...notFound]` catch-all route next to this file, for a mistyped URL
// under `/manager` — see `src/app/buyer/[...notFound]/page.tsx` for why that
// catch-all is needed at all. Renders inside `AppShell`.
export default function ManagerNotFound() {
  return (
    <NotFoundState
      description="That page doesn't exist under the manager section."
      href="/manager"
      label="Go to overview"
    />
  );
}
