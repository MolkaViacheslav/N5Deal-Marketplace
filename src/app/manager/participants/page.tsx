import type { Metadata } from "next";

import { PhasePlaceholder } from "@/components/layout/phase-placeholder";

export const metadata: Metadata = { title: "Participants" };

export default function Page() {
  return (
    <PhasePlaceholder
      title="Participants"
      phase="Phase 6"
      description="Every buyer and seller, with suspend, remove and reactivate controls."
    />
  );
}
