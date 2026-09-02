"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/layout/error-state";

// Root-level fallback: catches anything not already caught by a per-role
// error.tsx below it (CLAUDE.md → Roles & Routes), e.g. an error thrown from
// `/sign-in` or `/suspended`. Rendered inside the root layout, not in place
// of it — no `<html>`/`<body>` here, that's `global-error.tsx`'s job and this
// app doesn't need one.
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorState onRetry={reset} />;
}
