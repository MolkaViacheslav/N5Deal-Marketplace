"use client";

import { useCallback, useEffect, useRef, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNTRIES, INDUSTRIES, ASSET_CATEGORIES } from "@/lib/taxonomy";
import {
  DEFAULT_SORT,
  hasActiveFilters,
  positiveInt,
  SORT_OPTIONS,
  type AssetFilters,
} from "@/app/buyer/assets/filters";

// Radix Select forbids an empty-string item value (it uses "" internally to
// mean "nothing selected"), so "any" stands in for the cleared state and is
// translated back to a deleted query param on the way out.
const ANY = "any";

const SEARCH_DEBOUNCE_MS = 300;

/**
 * The URL is the only store of filter state — there is no `useState` holding a
 * filter value anywhere in this component.
 *
 * The selects are rendered straight from `filters`, so they cannot disagree
 * with the list behind them. The two free-text inputs are *uncontrolled*: the
 * DOM node holds what the user is mid-way through typing, and the URL is
 * updated from it on a debounce. That is a timing buffer, not a second copy of
 * the state — round-tripping every keystroke through the server first would
 * make the field lag a character behind the keyboard.
 *
 * `filters` arrives already parsed and validated by the server (see
 * `filters.ts`) rather than being read from `useSearchParams()` here. That
 * matters: a hand-edited `?country=Atlantis` is dropped from the query, and
 * because the bar renders the same parsed object, it also shows "Any country"
 * instead of displaying a filter that isn't actually applied.
 */
export function AssetFilterBar({ filters }: { filters: AssetFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  // What we last wrote to the URL ourselves. A `filters.search` that differs
  // from this came from somewhere else — back/forward, or Clear all — and the
  // input has to be caught up. Comparing against it (rather than remounting
  // the input with a `key`) is what stops the field losing focus and cursor
  // position every time our own debounced write lands.
  const lastPushedSearch = useRef(filters.search);

  useEffect(() => {
    if (filters.search === lastPushedSearch.current) return;
    lastPushedSearch.current = filters.search;

    if (searchRef.current && searchRef.current.value !== filters.search) {
      searchRef.current.value = filters.search;
    }
  }, [filters.search]);

  // Clear any pending debounce on unmount, so a navigation away can't fire a
  // router update against a route that is no longer mounted.
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  // The query string every `commit` builds on. It cannot be `useSearchParams()`
  // directly: `router.replace` runs inside a transition, so the hook keeps
  // returning the *pre-navigation* params until that transition commits. Pick
  // Category and then Country within the same beat and the second write, built
  // from a snapshot taken before the first landed, silently drops `category`
  // again. The debounced search write has the same hazard, one closure deeper.
  //
  // So our own writes are recorded here the moment they are issued, and the
  // hook is only trusted once nothing is in flight — which is exactly when a
  // change from somewhere else (back/forward, Clear filters) shows up.
  const paramsRef = useRef(searchParams.toString());

  useEffect(() => {
    if (!isPending) paramsRef.current = searchParams.toString();
  }, [isPending, searchParams]);

  const commit = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(paramsRef.current);

      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "" || value === ANY) next.delete(key);
        else next.set(key, value);
      }

      const queryString = next.toString();
      if (queryString === paramsRef.current) return;
      paramsRef.current = queryString;

      // `replace`, not `push`: a debounced text field would otherwise stack a
      // history entry per pause in typing and make the back button useless.
      // Sharing and refresh — the reasons the state is in the URL at all —
      // work identically either way.
      startTransition(() => {
        router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router]
  );

  function onSearchInput() {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const value = searchRef.current?.value ?? "";
      lastPushedSearch.current = value;
      commit({ search: value });
    }, SEARCH_DEBOUNCE_MS);
  }

  function clearAll() {
    clearTimeout(debounceRef.current);
    lastPushedSearch.current = "";
    paramsRef.current = "";
    if (searchRef.current) searchRef.current.value = "";

    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }

  const isFiltered = hasActiveFilters(filters);

  // `data-pending` both drives the dimming below and stays readable from a
  // test, which a bare `isPending && "opacity-60"` would not be.
  return (
    <div
      className="space-y-3 rounded-xl border bg-card p-4 transition-opacity data-[pending]:opacity-60"
      data-pending={isPending ? "" : undefined}
      aria-busy={isPending}
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            ref={searchRef}
            type="search"
            defaultValue={filters.search}
            onChange={onSearchInput}
            placeholder="Search listings by title, description or industry"
            aria-label="Search listings"
            className="pl-9"
          />
        </div>

        <FilterSelect
          label="Sort"
          value={filters.sort}
          placeholder="Sort"
          // The default is what an absent `sort` already means, so writing it
          // out only adds noise to a shared link.
          onChange={(value) =>
            commit({ sort: value === DEFAULT_SORT ? null : value })
          }
          options={SORT_OPTIONS.map((option) => ({ ...option }))}
          includeAny={false}
          className="sm:w-52"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FilterSelect
          label="Category"
          value={filters.category ?? ANY}
          placeholder="Any category"
          anyLabel="Any category"
          onChange={(value) => commit({ category: value })}
          options={ASSET_CATEGORIES.map((option) => ({ ...option }))}
        />

        <FilterSelect
          label="Country"
          value={filters.country ?? ANY}
          placeholder="Any country"
          anyLabel="Any country"
          onChange={(value) => commit({ country: value })}
          options={COUNTRIES.map((country) => ({
            value: country,
            label: country,
          }))}
        />

        <FilterSelect
          label="Industry"
          value={filters.industry ?? ANY}
          placeholder="Any industry"
          anyLabel="Any industry"
          onChange={(value) => commit({ industry: value })}
          options={INDUSTRIES.map((industry) => ({
            value: industry,
            label: industry,
          }))}
        />

        <div className="flex items-end gap-2">
          <PriceInput
            label="Min price"
            value={filters.priceMin}
            onCommit={(value) => commit({ priceMin: value })}
          />
          <PriceInput
            label="Max price"
            value={filters.priceMax}
            onCommit={(value) => commit({ priceMax: value })}
          />
        </div>
      </div>

      {isFiltered && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <X aria-hidden="true" />
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  placeholder,
  anyLabel,
  onChange,
  options,
  includeAny = true,
  className,
}: {
  label: string;
  value: string;
  placeholder: string;
  anyLabel?: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  includeAny?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full" aria-label={label}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {includeAny && <SelectItem value={ANY}>{anyLabel ?? "Any"}</SelectItem>}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Commits on blur and on Enter rather than on every keystroke. A debounced
 * price field re-runs the query on "1", "10", "100" on the way to "1000000" —
 * three throwaway result sets and three flashes of an empty list.
 *
 * `key` ties the DOM node's identity to the value in the URL, so Clear filters
 * (and a back navigation) genuinely resets it. Unlike the search box this
 * cannot steal focus mid-typing: the only thing that changes the URL here is
 * the blur/Enter that already ended the interaction.
 *
 * The raw string is run through the *parser's own* rule before it is written
 * anywhere, and the field is snapped to the result. `0`, `-5` and `1.5` are all
 * dropped server-side; without this the input would keep displaying one of them
 * while no such filter was applied and "Clear filters" stayed hidden — exactly
 * the bar/list disagreement the selects go out of their way to avoid.
 */
function PriceInput({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number | null;
  onCommit: (value: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function commitValue(raw: string) {
    const parsed = positiveInt(raw);
    const normalized = parsed === null ? "" : String(parsed);

    if (inputRef.current && inputRef.current.value !== normalized) {
      inputRef.current.value = normalized;
    }

    // Blurring a field nobody edited must not push a navigation.
    if (parsed !== value) onCommit(parsed === null ? null : normalized);
  }

  return (
    <div className="min-w-0 flex-1">
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <Input
        key={String(value)}
        ref={inputRef}
        type="number"
        min={0}
        step={1000}
        inputMode="numeric"
        defaultValue={value ?? ""}
        placeholder="€"
        aria-label={label}
        onBlur={(event) => commitValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitValue(event.currentTarget.value);
          }
        }}
      />
    </div>
  );
}
