"use client";

import { useCallback, useEffect, useRef, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Writing list state to the URL, for every filter bar in the app.
 *
 * List state lives in `searchParams` rather than in React state (CLAUDE.md →
 * Conventions), which makes "change one filter without disturbing the others"
 * the operation every bar needs. Doing it correctly is not obvious, and three
 * bars had three attempts at it before this was extracted:
 *
 * 1. The next URL cannot be built from `useSearchParams()`. `router.replace`
 *    runs inside a transition, so that hook keeps returning the
 *    *pre-navigation* params until the transition commits. Pick Category and
 *    then Country within the same beat and the second write, built from a
 *    snapshot taken before the first landed, silently drops `category` again.
 *    A debounced text field has the same hazard one closure deeper. So the
 *    query string this hook last issued is remembered in a ref and used as the
 *    base, and `useSearchParams()` is only trusted once nothing is in flight —
 *    which is exactly when a change from somewhere else (back/forward, a
 *    "clear all") is the thing that moved it.
 *
 * 2. `replace`, not `push`: a debounced search field stacks a history entry
 *    per pause in typing and makes the back button useless. Sharing and
 *    refresh — the reasons the state is in the URL at all — work identically
 *    either way.
 *
 * A `null` or `""` value deletes its key. Sentinels for "no filter" ("any",
 * "ALL") stay in the components that render them, since they are a quirk of
 * Radix's Select — it forbids an empty-string item value — and not something
 * the URL should know about.
 */
export function useUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const paramsRef = useRef(searchParams.toString());

  useEffect(() => {
    if (!isPending) paramsRef.current = searchParams.toString();
  }, [isPending, searchParams]);

  const navigate = useCallback(
    (queryString: string) => {
      paramsRef.current = queryString;
      startTransition(() => {
        router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router]
  );

  const commit = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(paramsRef.current);

      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }

      const queryString = next.toString();
      if (queryString === paramsRef.current) return;
      navigate(queryString);
    },
    [navigate]
  );

  /** Drops every filter, including ones this bar doesn't render. */
  const clearAll = useCallback(() => navigate(""), [navigate]);

  return { commit, clearAll, isPending };
}
