import type { Metadata } from "next";

import { PhasePlaceholder } from "@/components/layout/phase-placeholder";

export const metadata: Metadata = { title: "Inquiries" };

export default function Page() {
  return (
    <PhasePlaceholder
      title="Inquiries"
      phase="Phase 5"
      description="Messages you have sent to buyers, and the enquiries you have received."
    />
  );
}
