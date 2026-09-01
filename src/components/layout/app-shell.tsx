import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { MainNav } from "@/components/layout/main-nav";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { navItemsFor, ROLE_LABEL } from "@/lib/nav-items";
import { homeFor } from "@/lib/routes";
import type { Role } from "@/generated/prisma/enums";

type AppShellProps = {
  role: Role;
  name: string;
  email: string;
  children: React.ReactNode;
};

/**
 * The signed-in chrome shared by all three role sections. A Server Component —
 * it receives the already-verified user from the role layout rather than
 * fetching the session again.
 */
export function AppShell({ role, name, email, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link
            href={homeFor(role)}
            className="shrink-0 text-base font-semibold tracking-tight"
          >
            N5<span className="text-muted-foreground">Deal</span>
          </Link>

          <div className="hidden md:block">
            <MainNav items={navItemsFor(role)} />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <div className="text-sm font-medium">{name}</div>
              <div className="text-xs text-muted-foreground">{email}</div>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {ROLE_LABEL[role]}
            </Badge>
            <SignOutButton />
          </div>
        </div>

        {/* Nav drops below the brand bar on narrow screens rather than being
            hidden behind a menu — three links do not warrant a drawer. */}
        <div className="border-t px-4 py-2 md:hidden">
          <MainNav items={navItemsFor(role)} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
