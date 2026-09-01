import { requireRole } from "@/lib/auth-guard";
import { AppShell } from "@/components/layout/app-shell";

export default async function SellerLayout({
  children,
}: LayoutProps<"/seller">) {
  const user = await requireRole("SELLER");

  return (
    <AppShell role="SELLER" name={user.name} email={user.email}>
      {children}
    </AppShell>
  );
}
