"use client";

import { useState, useTransition } from "react";
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
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";

type ModerationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  successMessage: string;
  destructive?: boolean;
  onConfirm: (reason: string | undefined) => Promise<ActionResult>;
};

/**
 * Shared Suspend/Remove/Reactivate confirmation, used by both the
 * participants and assets tables. The reason is optional and only ever
 * surfaces in the audit log (CLAUDE.md: `AuditLog.reason` is nullable) — this
 * isn't a moderation-policy form, just a note-to-self for whoever reviews the
 * log later.
 */
export function ModerationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  successMessage,
  destructive,
  onConfirm,
}: ModerationDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    if (pending) return;
    if (!next) {
      setReason("");
      setError(null);
    }
    onOpenChange(next);
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await onConfirm(reason.trim() || undefined);
        if (!result.success) {
          setError(result.error);
          toast.error(result.error);
          return;
        }
        setReason("");
        onOpenChange(false);
        toast.success(successMessage);
      } catch (err) {
        // Only reaches here for a genuinely unexpected failure (network
        // error, an unhandled exception the action didn't convert to a
        // result) — Next redacts its message in production, which is
        // correct for the truly-unexpected case.
        const message = err instanceof Error ? err.message : "Something went wrong.";
        setError(message);
        toast.error(message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="moderation-reason">Reason (optional)</FieldLabel>
          <Textarea
            id="moderation-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Visible only in the audit log"
            rows={3}
            disabled={pending}
          />
        </Field>

        {error && (
          <p
            role="alert"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
