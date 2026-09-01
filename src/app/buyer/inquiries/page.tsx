import type { Metadata } from "next";

import { PhasePlaceholder } from "@/components/layout/phase-placeholder";

export const metadata: Metadata = { title: "Inquiries" };

export default function Page() {
  return (
    <PhasePlaceholder
      title="Inquiries"
      phase="Phase 4"
      description="Messages you have sent to sellers, and the replies you have received."
    />
  );
}
