"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteAsset } from "@/app/seller/assets/actions";

/**
 * Confirmation for a seller withdrawing their own listing.
 *
 * Deliberately not `components/manager/moderation-dialog.tsx`: that one collects
 * a reason for the audit log, and a seller's withdrawal writes no audit row —
 * `lib/audit.ts` records manager moderation, and a REMOVE_ASSET entry with a
 * seller as its actor would put ordinary housekeeping into the moderation table
 * on /manager.
 */
export function WithdrawListingDialog({
  assetId,
  title,
  open,
  onOpenChange,
}: {
  assetId: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    // Don't let a click on the overlay tear the dialog down mid-request; the
    // response would then have no UI left to report into.
    if (isPending) return;
    onOpenChange(next);
  }

  function onConfirm() {
    startTransition(async () => {
      try {
        const result = await deleteAsset({ id: assetId });

        if (!result.success) {
          toast.error(result.error);
          return;
        }

        onOpenChange(false);
        toast.success(`”${title}” was withdrawn.`);
        router.refresh();
      } catch (err) {
        // A genuinely unexpected failure — caught here rather than left to
        // propagate into the nearest error boundary, which would tear down
        // the seller's whole listings table over one failed withdrawal.
        const message =
          err instanceof Error ? err.message : "Something went wrong.";
        toast.error(message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Withdraw “{title}”?</DialogTitle>
          <DialogDescription>
            It disappears from buyer browse immediately and cannot be put back —
            you would have to publish a new listing. Inquiries you have already
            received about it are kept.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? "Withdrawing…" : "Withdraw listing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
