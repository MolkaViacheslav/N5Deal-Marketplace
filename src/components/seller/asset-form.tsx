"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KeyAssetsInput } from "@/components/seller/key-assets-input";
import {
  ASSET_CATEGORIES,
  BUSINESS_STATUSES,
  COUNTRIES,
  INDUSTRIES,
} from "@/lib/taxonomy";
import { createAsset, updateAsset } from "@/app/seller/assets/actions";
import {
  assetSchema,
  CATEGORY_FIELDS,
  type AssetValues,
} from "@/app/seller/assets/schema";
import type { AssetCategory, BusinessStatus } from "@/generated/prisma/enums";

/**
 * One form, not a wizard (CLAUDE.md → Asset validation).
 *
 * `category` is a Select at the top and the matching block renders below it
 * from `watch("category")`. A multi-step form fights `zodResolver` on a
 * discriminated union — the union validates the whole object at once, so every
 * step would have to run it against input that is deliberately half-filled.
 */

/**
 * The shape the *inputs* are registered against: a flat superset of all three
 * branches, with numbers typed loosely because an `<input>` holds a string.
 *
 * react-hook-form cannot take the discriminated union itself as `TFieldValues`
 * — `UseFormReturn` is invariant in it, so `register("regulatoryBody")` fails to
 * typecheck the moment the union could be the STAKE branch, which is exactly
 * when the field is on screen. Flattening the *form* type costs one cast on the
 * resolver below; `assetSchema` is still what validates, so the guarantee that
 * a LICENSE has a regulator is untouched.
 */
type AssetFormValues = {
  title: string;
  category: AssetCategory;
  country: string;
  industry: string;
  businessStatus: BusinessStatus;
  askingPrice: string | number;
  employees: string;
  yearFounded: string | number;
  description: string;
  keyAssetsIncluded: string[];
  regulatoryBody: string;
  licenseType: string;
  annualRevenue: string | number;
  reasonForSale: string;
  stakePercentage: string | number;
};

/** What an edit page hands in. Every nullable column arrives as `null` from
 *  Prisma and is converted to `""` below. */
export type AssetFormDefaults = {
  title: string;
  category: AssetCategory;
  country: string;
  industry: string;
  businessStatus: BusinessStatus;
  askingPrice: number;
  employees: string | null;
  yearFounded: number | null;
  description: string;
  keyAssetsIncluded: string[];
  regulatoryBody: string | null;
  licenseType: string | null;
  annualRevenue: number | null;
  reasonForSale: string | null;
  stakePercentage: number | null;
};

// A new listing starts on LICENSE rather than on an empty Select: the category
// block below is the part of this form that needs explaining, and an empty
// state there just looks like the page failed to render.
const NEW_LISTING_DEFAULTS: AssetFormDefaults = {
  title: "",
  category: "LICENSE",
  country: "",
  industry: "",
  businessStatus: "ACTIVE",
  askingPrice: 0,
  employees: null,
  yearFounded: null,
  description: "",
  keyAssetsIncluded: [],
  regulatoryBody: null,
  licenseType: null,
  annualRevenue: null,
  reasonForSale: null,
  stakePercentage: null,
};

export function AssetForm({
  assetId,
  defaults = NEW_LISTING_DEFAULTS,
}: {
  /** Absent → create. Present → update that listing. */
  assetId?: string;
  defaults?: AssetFormDefaults;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const isEdit = assetId !== undefined;

  const {
    register,
    control,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<AssetFormValues, unknown, AssetValues>({
    // See the note on `AssetFormValues`. The cast widens the shape the fields
    // are registered against; the schema doing the validating is unchanged, and
    // its branches still strip whatever does not belong to the chosen category.
    resolver: zodResolver(assetSchema) as unknown as Resolver<
      AssetFormValues,
      unknown,
      AssetValues
    >,
    defaultValues: {
      title: defaults.title,
      category: defaults.category,
      country: defaults.country,
      industry: defaults.industry,
      businessStatus: defaults.businessStatus,
      // Empty string rather than null throughout — an `<input>` given a null
      // value is uncontrolled, and React warns the moment it is typed into.
      askingPrice: defaults.askingPrice || "",
      employees: defaults.employees ?? "",
      yearFounded: defaults.yearFounded ?? "",
      description: defaults.description,
      keyAssetsIncluded: defaults.keyAssetsIncluded,
      regulatoryBody: defaults.regulatoryBody ?? "",
      licenseType: defaults.licenseType ?? "",
      annualRevenue: defaults.annualRevenue ?? "",
      reasonForSale: defaults.reasonForSale ?? "",
      stakePercentage: defaults.stakePercentage ?? "",
    },
  });

  // `useWatch`, not `watch("category")`: the latter returns a fresh function on
  // every render, which makes React Compiler skip memoizing this whole component
  // — and this is the largest component in the app. Same value, same
  // reactivity; `components/buyer/contact-dialog.tsx` hit this first.
  const category = useWatch({ control, name: "category" });

  /**
   * Switching category clears the category-specific block and nothing else.
   *
   * All five fields are cleared, not just the outgoing branch's: `annualRevenue`
   * belongs to both OPERATING_BUSINESS and STAKE, so "clear only what the old
   * category owned" has no single right answer for it. One flat rule is easier
   * to predict than a plausible-looking special case.
   *
   * `clearErrors` is not cosmetic. Without it, a "Name the regulator" error
   * raised on LICENSE stays in `formState` after a switch to STAKE, where the
   * field is no longer rendered — the form then refuses to submit with no
   * visible reason, which reads as a broken Save button.
   */
  function onCategoryChange(next: string) {
    setValue("category", next as AssetCategory, { shouldDirty: true });

    for (const field of CATEGORY_FIELDS) {
      setValue(field, "", { shouldDirty: true });
    }
    clearErrors([...CATEGORY_FIELDS]);
  }

  function onSubmit(values: AssetValues) {
    setFormError(null);

    startSaving(async () => {
      try {
        const result = isEdit
          ? await updateAsset({ id: assetId, values })
          : await createAsset(values);

        if (!result.success) {
          setFormError(result.error);
          toast.error(result.error);
          return;
        }

        toast.success(isEdit ? "Listing updated" : "Listing published");
        // The action returns an ActionResult rather than redirecting — a
        // `redirect()` inside it throws, which would break that contract — so
        // the navigation happens here.
        router.push("/seller/assets");
        router.refresh();
      } catch (err) {
        // A genuinely unexpected failure — caught here rather than left to
        // propagate into the nearest error boundary, which would replace the
        // whole page and discard everything typed into this form.
        const message =
          err instanceof Error ? err.message : "That listing could not be saved.";
        setFormError(message);
        toast.error(message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>What are you selling?</CardTitle>
          <CardDescription>
            The category decides which details buyers are shown further down.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <FieldGroup>
            <Field data-invalid={errors.title ? true : undefined}>
              <FieldLabel htmlFor="title">Title</FieldLabel>
              <Input
                id="title"
                placeholder="Lithuanian EMI licence with active SEPA membership"
                aria-invalid={errors.title ? true : undefined}
                {...register("title")}
              />
              {errors.title && <FieldError>{errors.title.message}</FieldError>}
            </Field>

            <Field data-invalid={errors.category ? true : undefined}>
              <FieldLabel htmlFor="category">Category</FieldLabel>
              <Select value={category} onValueChange={onCategoryChange}>
                <SelectTrigger
                  id="category"
                  className="w-full"
                  aria-invalid={errors.category ? true : undefined}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_CATEGORIES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                Changing this clears the category-specific fields below. Everything
                else you have typed stays.
              </FieldDescription>
              {/* Unreachable through the UI — the Select can only emit one of
                  three literals — but this is the union's discriminant, so a
                  malformed value surfaces here as `invalid_union_discriminator`
                  rather than as a field error further down. Silence would read
                  as a form that refuses to submit for no reason. */}
              {errors.category && (
                <FieldError>{errors.category.message}</FieldError>
              )}
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>The basics</CardTitle>
          <CardDescription>
            Buyers filter on country, industry and price, so these decide who
            finds the listing at all.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <FieldGroup>
            <div className="grid gap-5 sm:grid-cols-2">
              {/* Selects are uncontrolled by `register` — Radix does not emit a
                  native change event — so each one goes through Controller. */}
              <Controller
                control={control}
                name="country"
                render={({ field }) => (
                  <ChoiceField
                    id="country"
                    label="Country"
                    placeholder="Select a country"
                    options={COUNTRIES.map((c) => ({ value: c, label: c }))}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.country?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="industry"
                render={({ field }) => (
                  <ChoiceField
                    id="industry"
                    label="Industry"
                    placeholder="Select an industry"
                    options={INDUSTRIES.map((i) => ({ value: i, label: i }))}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.industry?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="businessStatus"
                render={({ field }) => (
                  <ChoiceField
                    id="businessStatus"
                    label="Business status"
                    placeholder="Select a status"
                    // Describes the company being sold, not the listing's
                    // moderation state — those are two different fields
                    // (CLAUDE.md → Naming note). A seller never sets the latter.
                    description="The state of the company itself. A dormant entity is a normal thing to sell."
                    options={BUSINESS_STATUSES.map((s) => ({ ...s }))}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.businessStatus?.message}
                  />
                )}
              />

              <Field data-invalid={errors.askingPrice ? true : undefined}>
                <FieldLabel htmlFor="askingPrice">Asking price (€)</FieldLabel>
                <Input
                  id="askingPrice"
                  type="number"
                  min={1}
                  step={1000}
                  inputMode="numeric"
                  placeholder="2500000"
                  aria-invalid={errors.askingPrice ? true : undefined}
                  {...register("askingPrice")}
                />
                <FieldDescription>Whole euros, no decimals.</FieldDescription>
                {errors.askingPrice && (
                  <FieldError>{errors.askingPrice.message}</FieldError>
                )}
              </Field>

              <Field data-invalid={errors.employees ? true : undefined}>
                <FieldLabel htmlFor="employees">Employees (optional)</FieldLabel>
                <Input
                  id="employees"
                  placeholder="12 / 20–50 / None"
                  aria-invalid={errors.employees ? true : undefined}
                  {...register("employees")}
                />
                <FieldDescription>
                  Free text — a range or &ldquo;none&rdquo; is fine.
                </FieldDescription>
                {errors.employees && (
                  <FieldError>{errors.employees.message}</FieldError>
                )}
              </Field>

              <Field data-invalid={errors.yearFounded ? true : undefined}>
                <FieldLabel htmlFor="yearFounded">
                  Year founded (optional)
                </FieldLabel>
                <Input
                  id="yearFounded"
                  type="number"
                  min={1800}
                  step={1}
                  inputMode="numeric"
                  placeholder="2016"
                  aria-invalid={errors.yearFounded ? true : undefined}
                  {...register("yearFounded")}
                />
                {errors.yearFounded && (
                  <FieldError>{errors.yearFounded.message}</FieldError>
                )}
              </Field>
            </div>

            <Field data-invalid={errors.description ? true : undefined}>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Textarea
                id="description"
                rows={7}
                placeholder="What is being sold, why it is worth buying, and what a buyer takes on. Paragraph breaks are kept."
                aria-invalid={errors.description ? true : undefined}
                {...register("description")}
              />
              {errors.description && (
                <FieldError>{errors.description.message}</FieldError>
              )}
            </Field>

            <Field data-invalid={errors.keyAssetsIncluded ? true : undefined}>
              <FieldLabel htmlFor="keyAssetsIncluded">
                What&apos;s included (optional)
              </FieldLabel>
              <Controller
                control={control}
                name="keyAssetsIncluded"
                render={({ field }) => (
                  <KeyAssetsInput
                    value={field.value ?? []}
                    onChange={field.onChange}
                    disabled={isSaving}
                  />
                )}
              />
              <FieldDescription>
                Licences, contracts, IP, staff — the things that transfer with the
                sale.
              </FieldDescription>
              {errors.keyAssetsIncluded && (
                <FieldError>{errors.keyAssetsIncluded.message}</FieldError>
              )}
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      {/* The category-specific block. Rendered from `watch("category")`, so it
          swaps the moment the Select above changes. */}
      <Card>
        <CardHeader>
          <CardTitle>
            {category === "LICENSE"
              ? "Licence details"
              : category === "OPERATING_BUSINESS"
                ? "Business details"
                : "Stake details"}
          </CardTitle>
          <CardDescription>
            Only asked for this category — buyers see these on the listing.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <FieldGroup>
            {category === "LICENSE" && (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field data-invalid={errors.regulatoryBody ? true : undefined}>
                  <FieldLabel htmlFor="regulatoryBody">
                    Regulatory body
                  </FieldLabel>
                  <Input
                    id="regulatoryBody"
                    placeholder="Bank of Lithuania"
                    aria-invalid={errors.regulatoryBody ? true : undefined}
                    {...register("regulatoryBody")}
                  />
                  {errors.regulatoryBody && (
                    <FieldError>{errors.regulatoryBody.message}</FieldError>
                  )}
                </Field>

                <Field data-invalid={errors.licenseType ? true : undefined}>
                  <FieldLabel htmlFor="licenseType">Licence type</FieldLabel>
                  <Input
                    id="licenseType"
                    placeholder="Electronic Money Institution (EMI)"
                    aria-invalid={errors.licenseType ? true : undefined}
                    {...register("licenseType")}
                  />
                  {errors.licenseType && (
                    <FieldError>{errors.licenseType.message}</FieldError>
                  )}
                </Field>
              </div>
            )}

            {category === "OPERATING_BUSINESS" && (
              <>
                <Field data-invalid={errors.annualRevenue ? true : undefined}>
                  <FieldLabel htmlFor="annualRevenue">
                    Annual revenue (€)
                  </FieldLabel>
                  <Input
                    id="annualRevenue"
                    type="number"
                    min={1}
                    step={1000}
                    inputMode="numeric"
                    placeholder="1800000"
                    aria-invalid={errors.annualRevenue ? true : undefined}
                    {...register("annualRevenue")}
                  />
                  {errors.annualRevenue && (
                    <FieldError>{errors.annualRevenue.message}</FieldError>
                  )}
                </Field>

                <Field data-invalid={errors.reasonForSale ? true : undefined}>
                  <FieldLabel htmlFor="reasonForSale">
                    Reason for sale (optional)
                  </FieldLabel>
                  <Textarea
                    id="reasonForSale"
                    rows={3}
                    placeholder="Owners retiring; no succession in place."
                    aria-invalid={errors.reasonForSale ? true : undefined}
                    {...register("reasonForSale")}
                  />
                  {errors.reasonForSale && (
                    <FieldError>{errors.reasonForSale.message}</FieldError>
                  )}
                </Field>
              </>
            )}

            {category === "STAKE" && (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field data-invalid={errors.stakePercentage ? true : undefined}>
                  <FieldLabel htmlFor="stakePercentage">
                    Stake offered (%)
                  </FieldLabel>
                  <Input
                    id="stakePercentage"
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    inputMode="numeric"
                    placeholder="35"
                    aria-invalid={errors.stakePercentage ? true : undefined}
                    {...register("stakePercentage")}
                  />
                  {errors.stakePercentage && (
                    <FieldError>{errors.stakePercentage.message}</FieldError>
                  )}
                </Field>

                <Field data-invalid={errors.annualRevenue ? true : undefined}>
                  <FieldLabel htmlFor="stakeAnnualRevenue">
                    Annual revenue (€, optional)
                  </FieldLabel>
                  <Input
                    id="stakeAnnualRevenue"
                    type="number"
                    min={1}
                    step={1000}
                    inputMode="numeric"
                    placeholder="Leave blank if pre-revenue"
                    aria-invalid={errors.annualRevenue ? true : undefined}
                    {...register("annualRevenue")}
                  />
                  {/* Optional here and only here — a pre-revenue stake sale is a
                      real thing, and the seed carries one. */}
                  {errors.annualRevenue && (
                    <FieldError>{errors.annualRevenue.message}</FieldError>
                  )}
                </Field>
              </div>
            )}
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
        <Button type="submit" disabled={isSaving}>
          {isSaving
            ? "Saving…"
            : isEdit
              ? "Save changes"
              : "Publish listing"}
        </Button>
        {/* No `disabled` here: `asChild` renders an anchor, and a disabled
            attribute on one is inert. Hidden mid-save instead, so a stray click
            cannot navigate away from a request already in flight. */}
        {!isSaving && (
          <Button asChild variant="outline">
            <Link href="/seller/assets">Cancel</Link>
          </Button>
        )}
      </div>
    </form>
  );
}

/** A labelled Select wired to a Controller field. Three of them on this form,
 *  and each one is six lines of Radix scaffolding. */
function ChoiceField({
  id,
  label,
  placeholder,
  description,
  options,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  placeholder: string;
  description?: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {/* Radix forbids an empty-string item value, so "nothing chosen yet" is
          represented by an undefined `value` and carried by the placeholder. */}
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full" aria-invalid={error ? true : undefined}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}
