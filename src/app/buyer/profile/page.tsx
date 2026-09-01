import type { Metadata } from "next";

import { PhasePlaceholder } from "@/components/layout/phase-placeholder";

export const metadata: Metadata = { title: "My profile" };

export default function Page() {
  return (
    <PhasePlaceholder
      title="My profile"
      phase="Phase 4"
      description="Describe your acquisition interests so sellers can find you and matching can score listings."
    />
  );
}
