"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ASSET_CATEGORIES, COUNTRIES } from "@/lib/taxonomy";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "REMOVED", label: "Removed" },
] as const;

/**
 * Same URL-as-state pattern as ParticipantsFilters — see the comment there.
 * Built standalone rather than shared with the (not-yet-built) buyer filter
 * bar: this table's columns and status vocabulary (ListingStatus, not just
 * "active") are manager-specific.
 */
export function AssetsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  // Same stale-closure guard as ParticipantsFilters — see the comment there.
  const lastPushedSearch = useRef(search);

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value || value === "ALL") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  useEffect(() => {
    const current = searchParams.get("search") ?? "";
    if (current !== lastPushedSearch.current) {
      lastPushedSearch.current = current;
      setSearch(current);
      return;
    }
    if (search === current) return;
    const timeout = setTimeout(() => {
      lastPushedSearch.current = search;
      setParam("search", search);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, searchParams, setParam]);

  return (
    <div className="flex flex-wrap gap-3">
      <Input
        placeholder="Search by title…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="max-w-xs"
      />
      <Select
        value={searchParams.get("category") ?? "ALL"}
        onValueChange={(value) => setParam("category", value)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All categories</SelectItem>
          {ASSET_CATEGORIES.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get("country") ?? "ALL"}
        onValueChange={(value) => setParam("country", value)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All countries</SelectItem>
          {COUNTRIES.map((country) => (
            <SelectItem key={country} value={country}>
              {country}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get("listingStatus") ?? "ALL"}
        onValueChange={(value) => setParam("listingStatus", value)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
