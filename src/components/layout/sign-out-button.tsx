"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    try {
      // A plain fetch under the hood — a network failure (offline, DNS,
      // server down) rejects this. Without the try/finally the button would
      // stay disabled and stuck on "Signing out…" forever.
      await authClient.signOut();
      // `refresh()` alongside `push()` because the header and every guarded
      // page are Server Components: without it the RSC cache would happily
      // re-render the signed-in shell after the cookie is already gone.
      router.push("/sign-in");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSignOut}
      disabled={pending}
      aria-label="Sign out"
    >
      <LogOut aria-hidden="true" />
      <span className="hidden sm:inline">
        {pending ? "Signing out…" : "Sign out"}
      </span>
    </Button>
  );
}
