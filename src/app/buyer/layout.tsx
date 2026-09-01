import { requireRole } from "@/lib/auth-guard";
import { AppShell } from "@/components/layout/app-shell";

export default async function BuyerLayout({
  children,
}: LayoutProps<"/buyer">) {
  const user = await requireRole("BUYER");

  return (
    <AppShell role="BUYER" name={user.name} email={user.email}>
      {children}
    </AppShell>
  );
}
