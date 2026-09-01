import type { Metadata } from "next";

import { PhasePlaceholder } from "@/components/layout/phase-placeholder";

export const metadata: Metadata = { title: "Buyers" };

export default function Page() {
  return (
    <PhasePlaceholder
      title="Buyers"
      phase="Phase 5"
      description="Browse and filter buyer profiles by industry, region and budget."
    />
  );
}
