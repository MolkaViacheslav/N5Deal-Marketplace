"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string };

/**
 * Client Component purely because active-link highlighting needs `usePathname`.
 * The nav *contents* are decided on the server (see `nav-items.ts`) so the role
 * never has to be trusted from the client.
 */
export function MainNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  // The single longest matching href, not "does this item match" checked
  // independently per item. Independent checks double-light a parent whose
  // own href is a path prefix of a sibling's — e.g. on /manager/participants,
  // both "/manager" (Overview) and "/manager/participants" (Participants)
  // pass a naive `startsWith(href + "/")` test, since the latter starts with
  // "/manager/" too. Picking the longest match resolves the ambiguity the
  // way a router would: the most specific route wins.
  const activeHref = items
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className="flex items-center gap-1" aria-label="Main">
      {items.map((item) => {
        const isActive = item.href === activeHref;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
