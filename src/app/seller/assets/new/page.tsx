import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AssetForm } from "@/components/seller/asset-form";
import { requireRole } from "@/lib/auth-guard";

export const metadata: Metadata = { title: "New listing" };

export default async function NewAssetPage() {
  // The layout has already established this is an ACTIVE seller; this call is
  // deduped by `cache()` inside `getSessionUser` and re-asserts the role next to
  // the screen that mutates, rather than only in the shell around it.
  await requireRole("SELLER");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/seller/assets"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to my listings
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">New listing</h1>
        <p className="text-sm text-muted-foreground">
          It goes live for buyers as soon as you publish. You can edit or withdraw
          it at any time.
        </p>
      </div>

      <AssetForm />
    </div>
  );
}
