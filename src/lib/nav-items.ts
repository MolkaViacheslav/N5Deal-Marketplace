// Navigation per role. Kept next to `auth-guard.ts` rather than in the header
// component so that the routes a role is offered and the routes a role is
// allowed into are decided in the same layer — the server.
//
// Routes here mirror CLAUDE.md → Roles & Routes.

import type { Role } from "@/generated/prisma/enums";
import type { NavItem } from "@/components/layout/main-nav";

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  BUYER: [
    { href: "/buyer/assets", label: "Listings" },
    { href: "/buyer/inquiries", label: "Inquiries" },
    { href: "/buyer/profile", label: "My profile" },
  ],
  SELLER: [
    { href: "/seller/assets", label: "My listings" },
    { href: "/seller/buyers", label: "Buyers" },
    { href: "/seller/inquiries", label: "Inquiries" },
  ],
  MANAGER: [
    { href: "/manager", label: "Overview" },
    { href: "/manager/participants", label: "Participants" },
    { href: "/manager/assets", label: "Listings" },
  ],
};

export function navItemsFor(role: Role): NavItem[] {
  return NAV_BY_ROLE[role] ?? [];
}

export const ROLE_LABEL: Record<Role, string> = {
  BUYER: "Buyer",
  SELLER: "Seller",
  MANAGER: "Platform Manager",
};
