import type { Metadata } from "next";

import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { ParticipantsFilters } from "@/components/manager/participants-filters";
import { ParticipantsTable, type ParticipantRow } from "@/components/manager/participants-table";
import {
  buildParticipantWhere,
  hasActiveFilters,
  parseParticipantFilters,
} from "@/app/manager/participants/filters";

export const metadata: Metadata = { title: "Participants" };

export default async function ParticipantsPage({
  searchParams,
}: PageProps<"/manager/participants">) {
  // ManagerLayout already calls requireRole("MANAGER") and redirects otherwise,
  // so this can never actually redirect here — re-asserted anyway as
  // defense-in-depth, and free: getSessionUser() is wrapped in React's cache().
  await requireRole("MANAGER");

  const filters = parseParticipantFilters(await searchParams);

  const participants: ParticipantRow[] = await prisma.user.findMany({
    where: buildParticipantWhere(filters),
    orderBy: { createdAt: "desc" },
    // Exactly the columns the table renders, so widening the row stops the
    // query compiling rather than letting it read a column it never fetched.
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      companyName: true,
      createdAt: true,
    },
    // Defensive cap, not real pagination — plenty of headroom over the seed
    // data, just enough to stop an unbounded query if it ever grows past that.
    take: 500,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Participants</h1>
      <ParticipantsFilters filters={filters} />
      <ParticipantsTable
        participants={participants}
        isFiltered={hasActiveFilters(filters)}
      />
    </div>
  );
}
