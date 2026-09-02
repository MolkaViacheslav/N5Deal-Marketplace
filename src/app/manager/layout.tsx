import { requireRole } from "@/lib/auth-guard";
import { AppShell } from "@/components/layout/app-shell";

export default async function ManagerLayout({
  children,
}: LayoutProps<"/manager">) {
  const user = await requireRole("MANAGER");

  return (
    <AppShell role="MANAGER" name={user.name} email={user.email}>
      {children}
    </AppShell>
  );
}
