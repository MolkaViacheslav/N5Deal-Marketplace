"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ModerationDialog } from "@/components/manager/moderation-dialog";
import { suspendUser, removeUser, reactivateUser } from "@/app/manager/participants/actions";
import type { UserStatus } from "@/generated/prisma/enums";

type PendingAction = "suspend" | "remove" | "reactivate" | null;

export function ParticipantRowActions({
  userId,
  name,
  status,
}: {
  userId: string;
  name: string;
  status: UserStatus;
}) {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  // REMOVED is terminal (CLAUDE.md: not reversible from the UI) — no actions at all.
  if (status === "REMOVED") {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  return (
    <>
      <div className="flex justify-end gap-2">
        {status === "ACTIVE" && (
          <Button
            variant="outline"
            size="sm"
            aria-label={`Suspend ${name}`}
            onClick={() => setPendingAction("suspend")}
          >
            Suspend
          </Button>
        )}
        {status === "SUSPENDED" && (
          <Button
            variant="outline"
            size="sm"
            aria-label={`Reactivate ${name}`}
            onClick={() => setPendingAction("reactivate")}
          >
            Reactivate
          </Button>
        )}
        <Button
          variant="destructive"
          size="sm"
          aria-label={`Remove ${name}`}
          onClick={() => setPendingAction("remove")}
        >
          Remove
        </Button>
      </div>

      <ModerationDialog
        open={pendingAction === "suspend"}
        onOpenChange={(open) => setPendingAction(open ? "suspend" : null)}
        title={`Suspend ${name}?`}
        description="Their assets (if any) leave buyer browse and their active session ends immediately. Reversible with Reactivate."
        confirmLabel="Suspend"
        successMessage={`${name} was suspended.`}
        destructive
        onConfirm={(reason) => suspendUser({ userId, reason })}
      />
      <ModerationDialog
        open={pendingAction === "reactivate"}
        onOpenChange={(open) => setPendingAction(open ? "reactivate" : null)}
        title={`Reactivate ${name}?`}
        description="Restores sign-in and any listings that were suspended along with them."
        confirmLabel="Reactivate"
        successMessage={`${name} was reactivated.`}
        onConfirm={(reason) => reactivateUser({ userId, reason })}
      />
      <ModerationDialog
        open={pendingAction === "remove"}
        onOpenChange={(open) => setPendingAction(open ? "remove" : null)}
        title={`Remove ${name}?`}
        description="Soft delete — hidden everywhere, data retained, and not reversible from this UI. Their assets (if any) are removed too."
        confirmLabel="Remove"
        successMessage={`${name} was removed.`}
        destructive
        onConfirm={(reason) => removeUser({ userId, reason })}
      />
    </>
  );
}
