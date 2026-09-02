"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/layout/error-state";

// Renders inside `AppShell` — `buyer/layout.tsx` keeps rendering around this
// boundary, only the page content underneath is replaced.
export default function BuyerError({
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
