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

const ROLE_OPTIONS = [
  { value: "ALL", label: "All roles" },
  { value: "BUYER", label: "Buyers" },
  { value: "SELLER", label: "Sellers" },
] as const;

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "REMOVED", label: "Removed" },
] as const;

/**
 * List state lives in the URL (CLAUDE.md → Conventions), not client state —
 * survives refresh, is shareable, and keeps /manager/participants a Server
 * Component. The search box is debounced locally so every keystroke doesn't
 * trigger a navigation.
 */
export function ParticipantsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  // Value this component itself last pushed to the URL, so the effect below
  // can tell "the URL changed because of something else (another filter,
  // browser back/forward)" apart from "the URL just caught up with us" —
  // without it, an unrelated navigation mid-debounce (e.g. changing Role
  // while still typing) captures a stale `searchParams` snapshot and, when
  // the timer fires, overwrites that other change.
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
      // The URL's search value moved without us causing it — resync the
      // input instead of letting a pending timer clobber it later.
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
        placeholder="Search name, email or company…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="max-w-xs"
      />
      <Select
        value={searchParams.get("role") ?? "ALL"}
        onValueChange={(value) => setParam("role", value)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get("status") ?? "ALL"}
        onValueChange={(value) => setParam("status", value)}
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
