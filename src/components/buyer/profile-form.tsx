"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { INDUSTRIES, REGIONS } from "@/lib/taxonomy";
import { upsertBuyerProfile } from "@/app/buyer/profile/actions";
import { PROFILE_FORM_ID } from "@/app/buyer/profile/form-id";
import {
  buyerProfileSchema,
  type BuyerProfileInput,
  type BuyerProfileValues,
} from "@/app/buyer/profile/schema";

export type ProfileFormDefaults = {
  industries: string[];
  regions: string[];
  budgetMin: number | null;
  budgetMax: number | null;
  description: string | null;
};

export function ProfileForm({
  defaults,
  hasProfile,
}: {
  defaults: ProfileFormDefaults;
  hasProfile: boolean;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isDirty },
  } = useForm<BuyerProfileInput, unknown, BuyerProfileValues>({
    resolver: zodResolver(buyerProfileSchema),
    defaultValues: {
      industries: defaults.industries as BuyerProfileInput["industries"],
      regions: defaults.regions as BuyerProfileInput["regions"],
      // Empty string, not null — an `<input>` with a null value is
      // uncontrolled, and React warns the moment the user types into it.
      budgetMin: defaults.budgetMin ?? "",
      budgetMax: defaults.budgetMax ?? "",
      description: defaults.description ?? "",
    },
  });

  function onSubmit(values: BuyerProfileValues) {
    setFormError(null);

    startSaving(async () => {
      try {
        const result = await upsertBuyerProfile(values);

        if (!result.success) {
          setFormError(result.error);
          return;
        }

        toast.success("Profile saved");
        // Re-baseline the form so `isDirty` goes back to false and the Save
        // button correctly reads as "nothing to do".
        //
        // `getValues()`, not the parsed `values`: the fields hold strings while
        // Zod hands back numbers, and `reset` sets the dirty baseline as well as
        // the values. Baselining `budgetMin: 500000` against an input holding
        // `"500000"` leaves the form permanently dirty on the next keystroke —
        // including one that types the old value straight back in.
        reset(getValues());
        router.refresh();
      } catch (err) {
        // A genuinely unexpected failure — caught here rather than left to
        // propagate into the nearest error boundary, which would replace the
        // whole page instead of just reporting the save as failed.
        const message =
          err instanceof Error ? err.message : "Those details could not be saved.";
        setFormError(message);
        toast.error(message);
      }
    });
  }

  return (
    <form
      id={PROFILE_FORM_ID}
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="scroll-mt-20 space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>Investment interests</CardTitle>
          <CardDescription>
            Sellers browse these to find buyers worth approaching, and we use
            them to rank listings for you.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <FieldGroup>
            <Controller
              control={control}
              name="industries"
              render={({ field }) => (
                <CheckboxGroup
                  legend="Industries"
                  description="Pick every sector you would consider."
                  options={INDUSTRIES}
                  selected={field.value ?? []}
                  onChange={field.onChange}
                  error={errors.industries?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="regions"
              render={({ field }) => (
                <CheckboxGroup
                  legend="Regions"
                  description="Countries where you are prepared to acquire."
                  options={REGIONS}
                  selected={field.value ?? []}
                  onChange={field.onChange}
                  error={errors.regions?.message}
                />
              )}
            />
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Budget</CardTitle>
          <CardDescription>
            Whole euros. Leave either side blank to keep it open-ended.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <FieldGroup>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field data-invalid={errors.budgetMin ? true : undefined}>
                <FieldLabel htmlFor="budgetMin">Minimum (€)</FieldLabel>
                <Input
                  id="budgetMin"
                  type="number"
                  min={0}
                  step={1000}
                  inputMode="numeric"
                  placeholder="No minimum"
                  aria-invalid={errors.budgetMin ? true : undefined}
                  {...register("budgetMin")}
                />
                {errors.budgetMin && (
                  <FieldError>{errors.budgetMin.message}</FieldError>
                )}
              </Field>

              <Field data-invalid={errors.budgetMax ? true : undefined}>
                <FieldLabel htmlFor="budgetMax">Maximum (€)</FieldLabel>
                <Input
                  id="budgetMax"
                  type="number"
                  min={0}
                  step={1000}
                  inputMode="numeric"
                  placeholder="No maximum"
                  aria-invalid={errors.budgetMax ? true : undefined}
                  {...register("budgetMax")}
                />
                {errors.budgetMax && (
                  <FieldError>{errors.budgetMax.message}</FieldError>
                )}
              </Field>
            </div>

            <Field data-invalid={errors.description ? true : undefined}>
              <FieldLabel htmlFor="description">
                About your mandate
              </FieldLabel>
              <Textarea
                id="description"
                rows={5}
                placeholder="What are you looking for, and what makes a deal a fit? Sellers read this before they contact you."
                aria-invalid={errors.description ? true : undefined}
                {...register("description")}
              />
              {errors.description && (
                <FieldError>{errors.description.message}</FieldError>
              )}
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      {formError && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {formError}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSaving || !isDirty}>
          {isSaving
            ? "Saving…"
            : hasProfile
              ? "Save changes"
              : "Create profile"}
        </Button>
        {!isDirty && !isSaving && (
          <span className="text-sm text-muted-foreground">
            No unsaved changes
          </span>
        )}
      </div>
    </form>
  );
}

/**
 * A plain checkbox grid rather than a combobox: both vocabularies are short and
 * fully known, so showing every option at once is faster to scan than a
 * type-ahead, and it avoids pulling `command` + `popover` into the bundle for
 * twenty-two fixed values.
 */
function CheckboxGroup({
  legend,
  description,
  options,
  selected,
  onChange,
  error,
}: {
  legend: string;
  description: string;
  options: readonly string[];
  selected: string[];
  onChange: (value: string[]) => void;
  error?: string;
}) {
  function toggle(option: string, checked: boolean) {
    // Rebuilt from `options` rather than appended, so the stored order always
    // matches the displayed order no matter what sequence they were clicked in.
    onChange(
      options.filter((candidate) =>
        candidate === option ? checked : selected.includes(candidate)
      )
    );
  }

  return (
    <fieldset>
      <legend className="text-sm font-medium">{legend}</legend>
      <p className="mt-0.5 mb-3 text-sm text-muted-foreground">{description}</p>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => {
          const id = `${legend}-${option}`.replace(/\s+/g, "-").toLowerCase();

          return (
            <label
              key={option}
              htmlFor={id}
              className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/50 has-data-[state=checked]:border-primary/40 has-data-[state=checked]:bg-primary/5"
            >
              <Checkbox
                id={id}
                checked={selected.includes(option)}
                onCheckedChange={(checked) => toggle(option, checked === true)}
              />
              <span className="min-w-0 truncate">{option}</span>
            </label>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
