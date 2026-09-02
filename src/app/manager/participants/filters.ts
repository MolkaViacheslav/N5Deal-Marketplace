// URL ⇄ query translation for the participants table.
//
// Same shape and the same rules as `app/buyer/assets/filters.ts`: parse once
// on the server, validate against a closed vocabulary, drop what doesn't fit,
// and hand the *parsed* object to both the query and the filter bar — so the
// bar can never display a filter the table isn't applying. Without that, a
// hand-typed `?role=MANAGER` leaves the Select showing a role while the query
// quietly falls back to listing everyone.

import { oneOf, searchText, type RawSearchParams } from "@/lib/search-params";
import { MODERATION_STATUSES } from "@/lib/taxonomy";
import type { Prisma } from "@/generated/prisma/client";
import type { Role, UserStatus } from "@/generated/prisma/enums";

// The brief scopes the Manager to Buyers, Sellers and Assets — Managers never
// appear in this table, which is also why the "no self, no other manager"
// guard in ./actions.ts never has anything to hide here; it stays as
// defence-in-depth for the Server Actions themselves.
export const LISTABLE_ROLES = ["BUYER", "SELLER"] as const satisfies Role[];

// `satisfies` rather than a cast: if Prisma's enum ever gains a state, this
// stops compiling instead of silently filtering on a stale vocabulary.
const PARTICIPANT_STATUSES = MODERATION_STATUSES.map(
  (status) => status.value
) satisfies UserStatus[];

export type ParticipantFilters = {
  search: string;
  role: (typeof LISTABLE_ROLES)[number] | null;
  status: UserStatus | null;
};

export function parseParticipantFilters(
  params: RawSearchParams
): ParticipantFilters {
  return {
    search: searchText(params.search),
    role: oneOf(params.role, LISTABLE_ROLES),
    status: oneOf(params.status, PARTICIPANT_STATUSES),
  };
}

/** True when anything is narrowing the table — drives the "Clear all"
 *  affordance and tells an empty result apart from an empty platform. */
export function hasActiveFilters(filters: ParticipantFilters): boolean {
  return Boolean(filters.search || filters.role || filters.status);
}

export function buildParticipantWhere(
  filters: ParticipantFilters
): Prisma.UserWhereInput {
  return {
    // Never widened by a filter: a manager row must not appear even if the
    // query string asks for one.
    role: filters.role ?? { in: [...LISTABLE_ROLES] },
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { email: { contains: filters.search, mode: "insensitive" } },
            { companyName: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}
