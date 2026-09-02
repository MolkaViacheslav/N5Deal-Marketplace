"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldError } from "@/components/ui/field";
import { createInquiry } from "@/app/buyer/assets/actions";
import {
  inquirySchema,
  MESSAGE_MAX,
  type InquiryValues,
} from "@/app/buyer/assets/inquiry-schema";

/**
 * Buyer → seller contact, raised from a listing's detail page.
 *
 * Lives under `components/buyer/` rather than `components/asset/` on purpose:
 * `components/asset/` holds role-neutral presentation (card, badges, facts)
 * that the seller and manager screens will reuse, while this is a buyer-only
 * mutation. The seller side gets its own mirrored "Contact buyer".
 */
export function ContactDialog({
  assetId,
  assetTitle,
  sellerLabel,
  previouslyContacted,
}: {
  assetId: string;
  assetTitle: string;
  sellerLabel: string;
  /** Whether this buyer has already written about this listing before. */
  previouslyContacted: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSending, startSending] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InquiryValues>({
    resolver: zodResolver(inquirySchema),
    defaultValues: { assetId, message: "" },
  });

  // `useWatch`, not `watch()`: the latter returns a fresh function each render,
  // which makes React Compiler bail out of memoizing this whole component.
  const messageLength = useWatch({ control, name: "message" })?.length ?? 0;

  function onSubmit(values: InquiryValues) {
    setFormError(null);

    startSending(async () => {
      try {
        const result = await createInquiry(values);

        if (!result.success) {
          setFormError(result.error);
          return;
        }

        setSent(true);
        setOpen(false);
        reset({ assetId, message: "" });
        toast.success("Message sent", {
          description: `${sellerLabel} will see it under their inquiries.`,
        });
      } catch (err) {
        // A genuinely unexpected failure (network, an unhandled server error),
        // not an `ActionResult` failure — caught here rather than left to
        // propagate into the nearest error boundary, which would replace the
        // whole page and lose the message the buyer just typed. Same rationale
        // as `components/manager/moderation-dialog.tsx`.
        const message =
          err instanceof Error ? err.message : "That message could not be sent.";
        setFormError(message);
        toast.error(message);
      }
    });
  }

  function onOpenChange(next: boolean) {
    // Don't let a click on the overlay discard a half-written message
    // mid-send; otherwise the request lands with no UI left to report it.
    if (isSending) return;
    setOpen(next);
    if (!next) setFormError(null);
  }

  // Survives only until the page is reloaded, at which point the server-derived
  // `previouslyContacted` takes over — both feed the same line of copy.
  const hasContacted = sent || previouslyContacted;

  return (
    <div className="space-y-3">
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          <Button className="w-full">
            <Mail aria-hidden="true" />
            Contact seller
          </Button>
        </DialogTrigger>

        <DialogContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <DialogHeader>
              <DialogTitle>Contact {sellerLabel}</DialogTitle>
              <DialogDescription>
                About “{assetTitle}”. They&apos;ll see your name and email
                alongside the message.
              </DialogDescription>
            </DialogHeader>

            <div className="my-4 space-y-2">
              <Field data-invalid={errors.message ? true : undefined}>
                <Textarea
                  rows={6}
                  autoFocus
                  required
                  placeholder="Introduce yourself and say what you'd like to know — timeline, financials, why this fits your mandate."
                  aria-label="Your message"
                  aria-invalid={errors.message ? true : undefined}
                  {...register("message")}
                />
                <div className="flex items-start justify-between gap-3">
                  {errors.message ? (
                    <FieldError>{errors.message.message}</FieldError>
                  ) : (
                    <span />
                  )}
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {messageLength}/{MESSAGE_MAX}
                  </span>
                </div>
              </Field>

              {formError && (
                <p
                  role="alert"
                  className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {formError}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isSending}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSending}>
                {isSending ? "Sending…" : "Send message"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {hasContacted && (
        <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <CheckCircle2
            className="mt-0.5 size-3.5 shrink-0 text-success"
            aria-hidden="true"
          />
          <span>
            You&apos;ve already contacted this seller.{" "}
            <Link href="/buyer/inquiries" className="underline underline-offset-4">
              View your inquiries
            </Link>
            .
          </span>
        </p>
      )}
    </div>
  );
}
