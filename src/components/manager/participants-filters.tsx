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
import { ROLE_LABEL } from "@/lib/nav-items";
import { MODERATION_STATUSES } from "@/lib/taxonomy";
import { useUrlFilters } from "@/lib/use-url-filters";
import {
  LISTABLE_ROLES,
  type ParticipantFilters,
} from "@/app/manager/participants/filters";

// Radix Select forbids an empty-string item value, so "ALL" stands in for the
// cleared state and becomes a deleted query param on the way out.
const ALL = "ALL";
const orNull = (value: string) => (value === ALL ? null : value);

const SEARCH_DEBOUNCE_MS = 300;

/**
 * List state lives in the URL (CLAUDE.md → Conventions), not client state —
 * it survives a refresh, is shareable, and keeps /manager/participants a
 * Server Component.
 *
 * `filters` arrives already parsed and validated by the server rather than
 * being read out of `useSearchParams()` here, for the same reason the buyer
 * bar does it: a hand-typed `?role=MANAGER` is dropped from the query, and
 * because the selects render from that same parsed object they show "All
 * roles" instead of a filter the table is not applying.
 */
export function ParticipantsFilters({
  filters,
}: {
  filters: ParticipantFilters;
}) {
  const { commit, isPending } = useUrlFilters();

  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  // What we last wrote ourselves. A `filters.search` that differs came from
  // somewhere else — back/forward, or a link — and the input has to catch up.
  // Comparing against it, rather than remounting the input with a `key`, is
  // what stops the field losing focus and cursor position on our own writes.
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

  // Same pending treatment as the buyer bar, so a filter change looks the
  // same everywhere while the server round-trip is in flight.
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
        placeholder="Search name, email or company…"
        aria-label="Search participants"
        className="max-w-xs"
      />

      <Select
        value={filters.role ?? ALL}
        onValueChange={(value) => commit({ role: orNull(value) })}
      >
        <SelectTrigger aria-label="Role">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All roles</SelectItem>
          {LISTABLE_ROLES.map((role) => (
            <SelectItem key={role} value={role}>
              {ROLE_LABEL[role]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.status ?? ALL}
        onValueChange={(value) => commit({ status: orNull(value) })}
      >
        <SelectTrigger aria-label="Status">
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
