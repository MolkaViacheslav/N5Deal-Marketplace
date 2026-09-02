"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/layout/error-state";

// Renders inside `AppShell` — `manager/layout.tsx` keeps rendering around this
// boundary, only the page content underneath is replaced.
export default function ManagerError({
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
