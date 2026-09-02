"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ModerationDialog } from "@/components/manager/moderation-dialog";
import { suspendAsset, removeAsset } from "@/app/manager/assets/actions";
import type { ListingStatus } from "@/generated/prisma/enums";

type PendingAction = "suspend" | "remove" | null;

export function AssetRowActions({
  assetId,
  title,
  listingStatus,
}: {
  assetId: string;
  title: string;
  listingStatus: ListingStatus;
}) {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  // REMOVED is terminal, and there's no Reactivate for assets in this build
  // (plan.md scopes /manager/assets to Suspend/Remove only) — no actions at all.
  if (listingStatus === "REMOVED") {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  return (
    <>
      <div className="flex justify-end gap-2">
        {listingStatus === "ACTIVE" && (
          <Button
            variant="outline"
            size="sm"
            aria-label={`Suspend ${title}`}
            onClick={() => setPendingAction("suspend")}
          >
            Suspend
          </Button>
        )}
        <Button
          variant="destructive"
          size="sm"
          aria-label={`Remove ${title}`}
          onClick={() => setPendingAction("remove")}
        >
          Remove
        </Button>
      </div>

      <ModerationDialog
        open={pendingAction === "suspend"}
        onOpenChange={(open) => setPendingAction(open ? "suspend" : null)}
        title={`Suspend "${title}"?`}
        description="The listing leaves buyer browse immediately. There's no direct Reactivate here for a single listing."
        confirmLabel="Suspend"
        successMessage={`"${title}" was suspended.`}
        destructive
        onConfirm={(reason) => suspendAsset({ assetId, reason })}
      />
      <ModerationDialog
        open={pendingAction === "remove"}
        onOpenChange={(open) => setPendingAction(open ? "remove" : null)}
        title={`Remove "${title}"?`}
        description="Soft delete — hidden everywhere, data retained, and not reversible from this UI."
        confirmLabel="Remove"
        successMessage={`"${title}" was removed.`}
        destructive
        onConfirm={(reason) => removeAsset({ assetId, reason })}
      />
    </>
  );
}
