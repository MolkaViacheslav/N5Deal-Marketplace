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
import {
  ASSET_CATEGORIES,
  COUNTRIES,
  MODERATION_STATUSES,
} from "@/lib/taxonomy";
import { useUrlFilters } from "@/lib/use-url-filters";
import type { ManagerAssetFilters } from "@/app/manager/assets/filters";

const ALL = "ALL";
const orNull = (value: string) => (value === ALL ? null : value);

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Same URL-as-state contract as ParticipantsFilters and the buyer bar — see
 * the note in `lib/use-url-filters.ts` for why every write is built on the
 * last URL this component issued rather than on `useSearchParams()`.
 *
 * Kept separate from the buyer's filter bar rather than shared: this table
 * filters on `listingStatus`, a moderation state a buyer never sees, and has
 * no price or industry controls. What the two genuinely share is the URL
 * mechanics, and that is what was extracted.
 */
export function AssetsFilters({ filters }: { filters: ManagerAssetFilters }) {
  const { commit } = useUrlFilters();

  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const lastPushedSearch = useRef(filters.search);

  useEffect(() => {
    if (filters.search === lastPushedSearch.current) return;
    lastPushedSearch.current = filters.search;

    if (searchRef.current && searchRef.current.value !== filters.search) {
      searchRef.current.value = filters.search;
    }
  }, [filters.search]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  function onSearchInput() {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const value = searchRef.current?.value ?? "";
      lastPushedSearch.current = value;
      commit({ search: value });
    }, SEARCH_DEBOUNCE_MS);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Input
        ref={searchRef}
        type="search"
        defaultValue={filters.search}
        onChange={onSearchInput}
        placeholder="Search title or industry…"
        aria-label="Search listings"
        className="max-w-xs"
      />

      <Select
        value={filters.category ?? ALL}
        onValueChange={(value) => commit({ category: orNull(value) })}
      >
        <SelectTrigger aria-label="Category">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All categories</SelectItem>
          {ASSET_CATEGORIES.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.country ?? ALL}
        onValueChange={(value) => commit({ country: orNull(value) })}
      >
        <SelectTrigger aria-label="Country">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All countries</SelectItem>
          {COUNTRIES.map((country) => (
            <SelectItem key={country} value={country}>
              {country}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.listingStatus ?? ALL}
        onValueChange={(value) => commit({ listingStatus: orNull(value) })}
      >
        <SelectTrigger aria-label="Listing status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {MODERATION_STATUSES.map((status) => (
            <SelectItem key={status.value} value={status.value}>
              {status.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
