import type { Metadata } from "next";

import { PhasePlaceholder } from "@/components/layout/phase-placeholder";

export const metadata: Metadata = { title: "Overview" };

export default function Page() {
  return (
    <PhasePlaceholder
      title="Overview"
      phase="Phase 6"
      description="Marketplace counters and the most recent moderation actions."
    />
  );
}
