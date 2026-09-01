import type { Metadata } from "next";

import { PhasePlaceholder } from "@/components/layout/phase-placeholder";

export const metadata: Metadata = { title: "Listings" };

export default function Page() {
  return (
    <PhasePlaceholder
      title="Listings"
      phase="Phase 6"
      description="Every listing on the marketplace, with suspend and remove controls."
    />
  );
}
