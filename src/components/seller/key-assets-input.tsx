"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const MAX_KEY_ASSETS = 10;

/**
 * Free-text tag input for `Asset.keyAssetsIncluded`.
 *
 * A chip list rather than a comma-separated textarea because this is exactly how
 * the value is rendered back — as discrete pills on the asset card and the
 * detail page. A textarea hides where one item ends and the next begins, and
 * gives the 10-item limit nothing to attach to.
 *
 * Not a checkbox grid either (which is how the buyer profile takes its
 * industries and regions): those are closed vocabularies in `taxonomy.ts`,
 * whereas what a sale includes is genuinely open — the seed alone carries
 * "EMI licence", "SEPA direct membership", "Existing merchant book".
 */
export function KeyAssetsInput({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isFull = value.length >= MAX_KEY_ASSETS;

  function add(raw: string) {
    const tag = raw.trim();
    if (!tag || isFull) return;

    // Case-insensitive de-dupe: "EMI licence" and "EMI Licence" are one tag to a
    // reader, and two chips that look the same is a bug report waiting to happen.
    const exists = value.some(
      (existing) => existing.toLowerCase() === tag.toLowerCase()
    );
    if (!exists) onChange([...value, tag]);

    setDraft("");
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      // Enter would otherwise submit the whole form on the first tag.
      event.preventDefault();
      add(draft);
      return;
    }

    // Backspace on an empty field removes the last chip — the convention every
    // tag input has, and the only way to fix a typo without reaching for a mouse.
    if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          // A half-typed tag left in the field when the seller hits Save would
          // otherwise be silently dropped.
          onBlur={() => add(draft)}
          disabled={disabled || isFull}
          placeholder={
            isFull
              ? `That's the maximum of ${MAX_KEY_ASSETS}`
              : "e.g. EMI licence — press Enter to add"
          }
          aria-label="Add an included asset"
        />
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {value.length}/{MAX_KEY_ASSETS}
        </span>
      </div>

      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <li
              key={tag}
              className={cn(
                "flex items-center gap-1 rounded-md bg-muted py-0.5 pr-1 pl-2.5",
                "text-sm text-muted-foreground"
              )}
            >
              <span className="max-w-60 truncate" title={tag}>
                {tag}
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  onChange(value.filter((item) => item !== tag));
                  inputRef.current?.focus();
                }}
                aria-label={`Remove ${tag}`}
                className="rounded-sm p-0.5 hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
