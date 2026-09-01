import type { Metadata } from "next";

import { PhasePlaceholder } from "@/components/layout/phase-placeholder";

export const metadata: Metadata = { title: "My listings" };

export default function Page() {
  return (
    <PhasePlaceholder
      title="My listings"
      phase="Phase 5"
      description="The assets you have published, with their moderation status."
    />
  );
}
