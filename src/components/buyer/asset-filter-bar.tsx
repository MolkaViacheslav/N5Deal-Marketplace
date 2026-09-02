"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Search, Sparkles, X } from "lucide-react";

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
import { useUrlFilters } from "@/lib/use-url-filters";
import type { AssetCategory } from "@/generated/prisma/enums";
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

/** The sentinel stays local to the bar; the URL just loses the key. */
const orNull = (value: string) => (value === ANY ? null : value);

const SEARCH_DEBOUNCE_MS = 300;

// Matches the cap on /api/ai/parse-query's request schema.
const AI_QUERY_MAX_LENGTH = 300;

const AI_EXAMPLES = [
  "Licensed fintech company in Western Europe under 1M",
  "Operating business in healthcare, 500k–2M budget",
];

/** The shape /api/ai/parse-query resolves to — either a parsed subset of
 *  AssetFilters, or the fallback envelope naming the raw query as plain text
 *  search. Declared here rather than imported from the route module, which is
 *  server-only. */
type ParseQueryResponse =
  | { fallback: true; search: string }
  | {
      search?: string;
      country?: string;
      industry?: string;
      category?: AssetCategory;
      priceMin?: number;
      priceMax?: number;
    };

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
export function AssetFilterBar({
  filters,
  hasProfile,
}: {
  filters: AssetFilters;
  /** Without a profile there is nothing to score listings against, so "Best
   *  match" is not offered — the same rule as everywhere else in this bar: it
   *  never shows a choice the list behind it would not honour. */
  hasProfile: boolean;
}) {
  const { commit, clearAll: clearParams, isPending } = useUrlFilters();

  // Bumped by clearAll() below to tell AiSearchBar to reset itself — see the
  // comment there for why this can't just be derived from `filters`.
  const [aiResetSignal, setAiResetSignal] = useState(0);

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
    if (searchRef.current) searchRef.current.value = "";
    clearParams();
    // AiSearchBar holds its own query text and any leftover "AI unavailable"
    // note — neither is derived from `filters`, so clearing the URL alone
    // would leave a stale sentence and a note about a search that no longer
    // applies sitting above an otherwise-empty bar.
    setAiResetSignal((n) => n + 1);
  }

  const isFiltered = hasActiveFilters(filters);

  const sortOptions = SORT_OPTIONS.filter(
    (option) => hasProfile || option.value !== "best-match"
  ).map((option) => ({ ...option }));

  // `data-pending` both drives the dimming below and stays readable from a
  // test, which a bare `isPending && "opacity-60"` would not be.
  return (
    <div className="space-y-4">
      <AiSearchBar key={aiResetSignal} commit={commit} />

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
            options={sortOptions}
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
            onChange={(value) => commit({ category: orNull(value) })}
            options={ASSET_CATEGORIES.map((option) => ({ ...option }))}
          />

          <FilterSelect
            label="Country"
            value={filters.country ?? ANY}
            placeholder="Any country"
            anyLabel="Any country"
            onChange={(value) => commit({ country: orNull(value) })}
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
            onChange={(value) => commit({ industry: orNull(value) })}
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
    </div>
  );
}

/**
 * The AI search box, above the manual filter bar. Colocated like
 * `FilterSelect`/`PriceInput` below rather than split into its own file —
 * this bar already keeps its small pieces beside the component that uses
 * them.
 *
 * Talks to `/api/ai/parse-query` directly rather than through `useUrlFilters`
 * itself; it receives `commit` from the parent so there is exactly one
 * `useUrlFilters()` call in this file; both the AI box and the manual filters
 * below write through the same function.
 *
 * A request in flight is *not* reflected in the parent bar's `isPending`
 * (that only covers the URL transition `commit` triggers) — this component
 * tracks its own `isSearching` for the network round trip to the route.
 *
 * The parent remounts this component (via `key={aiResetSignal}`) on
 * "Clear filters" rather than pushing a reset down through a prop — the
 * same trick `PriceInput` below uses to reset on the URL value changing.
 * An effect that cleared `query`/the notes on a signal prop would work too,
 * but `react-hooks/set-state-in-effect` flags synchronous setState-in-effect
 * for good reason: `key` gets the same result without the extra render.
 */
function AiSearchBar({
  commit,
}: {
  commit: (updates: Record<string, string | null>) => void;
}) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showFallbackNote, setShowFallbackNote] = useState(false);
  const [showPartialNote, setShowPartialNote] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || isSearching) return;

    setIsSearching(true);
    setShowFallbackNote(false);
    setShowPartialNote(false);

    try {
      const response = await fetch("/api/ai/parse-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });

      // A non-2xx (401 unauthenticated, 400 malformed body) is a protocol
      // failure, not the route's own documented fallback envelope — treat it
      // the same as a network error below rather than reading its body as if
      // it were `ParseQueryResponse`.
      if (!response.ok) throw new Error(`parse-query responded ${response.status}`);

      const data = (await response.json()) as ParseQueryResponse;

      if ("fallback" in data) {
        commit({ search: data.search });
        setShowFallbackNote(true);
        return;
      }

      // country/industry are re-checked against the same closed vocabulary
      // parseAssetFilters() enforces server-side. The system prompt already
      // asks the model to omit anything that isn't an exact match, but this
      // is the one place in the app where a filter can silently fail to
      // apply from code the user didn't write themselves — a hand-edited URL
      // is the user's own doing, this wouldn't be.
      const updates: Record<string, string | null> = {};
      let droppedAny = false;

      if (data.search !== undefined) updates.search = data.search;

      if (data.country !== undefined) {
        if ((COUNTRIES as readonly string[]).includes(data.country)) {
          updates.country = data.country;
        } else {
          droppedAny = true;
        }
      }

      if (data.industry !== undefined) {
        if ((INDUSTRIES as readonly string[]).includes(data.industry)) {
          updates.industry = data.industry;
        } else {
          droppedAny = true;
        }
      }

      if (data.category !== undefined) updates.category = data.category;
      if (data.priceMin !== undefined) updates.priceMin = String(data.priceMin);
      if (data.priceMax !== undefined) updates.priceMax = String(data.priceMax);

      setShowPartialNote(droppedAny);

      // Nothing survived — not necessarily a failure (the AI may genuinely
      // have found nothing structured), but committing an empty update is a
      // no-op and the click would visibly do nothing. Fall back to a plain
      // search of the raw query instead.
      commit(Object.keys(updates).length > 0 ? updates : { search: trimmed });
    } catch {
      // The route itself never throws (CLAUDE.md → AI feature), but the
      // fetch to it can still fail — the "never breaks the page" guarantee
      // has to hold end to end, not just inside the route.
      commit({ search: trimmed });
      setShowFallbackNote(true);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border bg-card p-4"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Sparkles
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Describe what you're looking for... (e.g. licensed fintech in Portugal under 2M)"
            aria-label="Describe what you're looking for"
            maxLength={AI_QUERY_MAX_LENGTH}
            disabled={isSearching}
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={isSearching || !query.trim()}>
          {isSearching ? "Searching…" : "Search"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {AI_EXAMPLES.map((example) => (
          <Button
            key={example}
            type="button"
            variant="outline"
            size="sm"
            disabled={isSearching}
            onClick={() => setQuery(example)}
          >
            {example}
          </Button>
        ))}
      </div>

      {showFallbackNote && (
        <p className="text-xs text-muted-foreground">
          AI unavailable — showing text search results
        </p>
      )}
      {showPartialNote && (
        <p className="text-xs text-muted-foreground">
          AI couldn&apos;t match every detail to an exact filter — refine below if needed
        </p>
      )}
    </form>
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
