"use client";

import { useEffect, useRef } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INDUSTRIES, REGIONS } from "@/lib/taxonomy";
import { useUrlFilters } from "@/lib/use-url-filters";
import {
  positiveInt,
  type SellerBuyerFilters,
} from "@/app/seller/buyers/filters";

const ALL = "ALL";
const orNull = (value: string) => (value === ALL ? null : value);

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Same URL-as-state contract as the buyer browse bar and the two manager bars —
 * see `lib/use-url-filters.ts` for why every write is built on the last URL this
 * component issued rather than on `useSearchParams()`.
 */
export function BuyersFilters({ filters }: { filters: SellerBuyerFilters }) {
  const { commit, isPending } = useUrlFilters();

  const searchRef = useRef<HTMLInputElement>(null);
  const budgetRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const lastPushedSearch = useRef(filters.search);

  // Both text inputs are uncontrolled (`defaultValue`), which means React will
  // not re-sync them when the URL moves from somewhere else — the browser's back
  // button, or a link carrying its own filters. Without these effects the bar
  // would go on showing the previous value while the list rendered the new one.
  useEffect(() => {
    if (filters.search === lastPushedSearch.current) return;
    lastPushedSearch.current = filters.search;

    if (searchRef.current && searchRef.current.value !== filters.search) {
      searchRef.current.value = filters.search;
    }
  }, [filters.search]);

  useEffect(() => {
    const next = filters.budgetFor === null ? "" : String(filters.budgetFor);
    if (budgetRef.current && budgetRef.current.value !== next) {
      budgetRef.current.value = next;
    }
  }, [filters.budgetFor]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  function onSearchInput() {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const value = searchRef.current?.value ?? "";
      lastPushedSearch.current = value;
      commit({ search: value });
    }, SEARCH_DEBOUNCE_MS);
  }

  function onBudgetCommit() {
    // Run the parser's own rule before writing, so the input can never display a
    // value the list is not filtering on (typing `0` or `-5` clears the filter
    // rather than leaving a number on screen that the server drops).
    const parsed = positiveInt(budgetRef.current?.value);
    const next = parsed === null ? null : String(parsed);

    if (budgetRef.current) budgetRef.current.value = next ?? "";
    commit({ budgetFor: next });
  }

  return (
    <div
      className="flex flex-wrap gap-3 transition-opacity data-[pending]:opacity-60"
      data-pending={isPending ? "" : undefined}
      aria-busy={isPending}
    >
      <Input
        ref={searchRef}
        type="search"
        defaultValue={filters.search}
        onChange={onSearchInput}
        placeholder="Search name or company…"
        aria-label="Search buyers"
        className="max-w-xs"
      />

      <Select
        value={filters.industry ?? ALL}
        onValueChange={(value) => commit({ industry: orNull(value) })}
      >
        <SelectTrigger aria-label="Industry of interest">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All industries</SelectItem>
          {INDUSTRIES.map((industry) => (
            <SelectItem key={industry} value={industry}>
              {industry}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.region ?? ALL}
        onValueChange={(value) => commit({ region: orNull(value) })}
      >
        <SelectTrigger aria-label="Region of interest">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All regions</SelectItem>
          {REGIONS.map((region) => (
            <SelectItem key={region} value={region}>
              {region}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* A price, not a range: the seller's question is "who could afford this
          listing?", and one number answers it against both of a buyer's bounds.
          Committed on blur and on Enter rather than per keystroke — a debounce
          here would fire a query at every intermediate digit of "2500000". */}
      <Input
        ref={budgetRef}
        type="number"
        min={1}
        step={1000}
        inputMode="numeric"
        defaultValue={filters.budgetFor ?? ""}
        onBlur={onBudgetCommit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onBudgetCommit();
          }
        }}
        placeholder="Budget covers €…"
        aria-label="Budget covers this amount"
        className="max-w-44"
      />
    </div>
  );
}
