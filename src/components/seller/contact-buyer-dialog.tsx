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
import { contactBuyer } from "@/app/seller/buyers/actions";
import {
  contactBuyerSchema,
  MESSAGE_MAX,
  type ContactBuyerValues,
} from "@/app/seller/buyers/inquiry-schema";

/**
 * Seller → buyer contact, raised from a buyer's profile page.
 *
 * The mirror of `components/buyer/contact-dialog.tsx`. It lives under
 * `components/seller/` for the same reason that one lives under
 * `components/buyer/`: `components/asset/` holds role-neutral presentation, and
 * a role-specific mutation is not that.
 */
export function ContactBuyerDialog({
  buyerId,
  buyerLabel,
  previouslyContacted,
}: {
  buyerId: string;
  buyerLabel: string;
  /** Whether this seller has written to this buyer before. */
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
  } = useForm<ContactBuyerValues>({
    resolver: zodResolver(contactBuyerSchema),
    defaultValues: { buyerId, message: "" },
  });

  // `useWatch`, not `watch()`: the latter returns a fresh function each render,
  // which makes React Compiler bail out of memoizing this whole component.
  const messageLength = useWatch({ control, name: "message" })?.length ?? 0;

  function onSubmit(values: ContactBuyerValues) {
    setFormError(null);

    startSending(async () => {
      try {
        const result = await contactBuyer(values);

        if (!result.success) {
          setFormError(result.error);
          return;
        }

        setSent(true);
        setOpen(false);
        reset({ buyerId, message: "" });
        toast.success("Message sent", {
          description: `${buyerLabel} will see it under their inquiries.`,
        });
      } catch (err) {
        // See the matching comment in components/buyer/contact-dialog.tsx: a
        // genuinely unexpected failure, kept from reaching the nearest error
        // boundary so the seller's half-written message isn't lost with it.
        const message =
          err instanceof Error ? err.message : "That message could not be sent.";
        setFormError(message);
        toast.error(message);
      }
    });
  }

  function onOpenChange(next: boolean) {
    // Don't let a click on the overlay discard a half-written message mid-send;
    // the request would land with no UI left to report it.
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
            Contact buyer
          </Button>
        </DialogTrigger>

        <DialogContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <DialogHeader>
              <DialogTitle>Contact {buyerLabel}</DialogTitle>
              <DialogDescription>
                They&apos;ll see your name and email alongside the message. Mention
                the listing you have in mind — this message isn&apos;t attached to
                one.
              </DialogDescription>
            </DialogHeader>

            <div className="my-4 space-y-2">
              <Field data-invalid={errors.message ? true : undefined}>
                <Textarea
                  rows={6}
                  autoFocus
                  required
                  placeholder="Introduce yourself and say what you have that fits their mandate — sector, size, why now."
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
            You&apos;ve already contacted this buyer.{" "}
            <Link
              href="/seller/inquiries"
              className="underline underline-offset-4"
            >
              View your inquiries
            </Link>
            .
          </span>
        </p>
      )}
    </div>
  );
}
