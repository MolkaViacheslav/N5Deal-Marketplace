import { requireRole } from "@/lib/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/sonner";

export default async function ManagerLayout({
  children,
}: LayoutProps<"/manager">) {
  const user = await requireRole("MANAGER");

  return (
    <AppShell role="MANAGER" name={user.name} email={user.email}>
      {children}
      {/* Scoped to this section rather than the root layout, which isn't
          Phase 6's file — Buyer/Seller can mount their own, or Phase 9 can
          hoist a single instance to the root, without conflicting with this. */}
      <Toaster />
    </AppShell>
  );
}
