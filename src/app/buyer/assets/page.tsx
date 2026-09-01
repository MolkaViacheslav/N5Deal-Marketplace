import type { Metadata } from "next";

import { PhasePlaceholder } from "@/components/layout/phase-placeholder";

export const metadata: Metadata = { title: "Listings" };

export default function Page() {
  return (
    <PhasePlaceholder
      title="Listings"
      phase="Phase 3"
      description="Browse and filter available assets by country, category, industry and price."
    />
  );
}
