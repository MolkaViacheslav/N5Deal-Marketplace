import type { Metadata } from "next";

import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { ParticipantsFilters } from "@/components/manager/participants-filters";
import { ParticipantsTable, type ParticipantRow } from "@/components/manager/participants-table";
import type { Role, UserStatus } from "@/generated/prisma/enums";
import type { UserWhereInput } from "@/generated/prisma/models";

export const metadata: Metadata = { title: "Participants" };

// The brief scopes the Manager to Buyers, Sellers and Assets — Managers
// never appear here, which is also why the "no self, no other manager"
// guard in ./actions.ts never has anything to hide in this table; it stays
// as defense-in-depth for the Server Actions themselves.
const LISTABLE_ROLES: Role[] = ["BUYER", "SELLER"];
const VALID_STATUSES: UserStatus[] = ["ACTIVE", "SUSPENDED", "REMOVED"];

export default async function ParticipantsPage({
  searchParams,
}: PageProps<"/manager/participants">) {
  // ManagerLayout already calls requireRole("MANAGER") and redirects otherwise,
  // so this can never actually redirect here — re-asserted anyway as
  // defense-in-depth, and free: getSessionUser() is wrapped in React's cache().
  await requireRole("MANAGER");

  const params = await searchParams;
  const roleParam = typeof params.role === "string" ? params.role : undefined;
  const statusParam = typeof params.status === "string" ? params.status : undefined;
  const search = typeof params.search === "string" ? params.search.trim() : "";

  const role = LISTABLE_ROLES.find((candidate) => candidate === roleParam);
  const status = VALID_STATUSES.find((candidate) => candidate === statusParam);

  const where: UserWhereInput = {
    role: role ?? { in: LISTABLE_ROLES },
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { companyName: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    // Defensive cap, not real pagination — plenty of headroom over the seed
    // data, just enough to stop an unbounded query if it ever grows past that.
    take: 500,
  });

  const participants: ParticipantRow[] = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    companyName: user.companyName,
    createdAt: user.createdAt,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Participants</h1>
      <ParticipantsFilters />
      <ParticipantsTable participants={participants} />
    </div>
  );
}
