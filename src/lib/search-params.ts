// Reading `searchParams` safely, for every list screen.
//
// List state lives in the query string (CLAUDE.md → Conventions), which makes
// it user-editable by definition: every value has to be checked against a
// closed vocabulary before it reaches Prisma, and a value that fails is
// DROPPED rather than rejected — a stale or hand-mangled link should degrade
// to a broader result set, never to an error page or to an empty list that
// reads as "no matches" when the filter itself was nonsense.
//
// Both helpers exist because Next hands a repeated key (`?role=A&role=B`)
// through as an array, and `typeof param === "string"` — the obvious check —
// silently treats that as "not provided" on some screens and as a filter on
// others. One rule, one place.

/** Next hands repeated keys through as arrays; we only ever want one value. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

/** First non-empty value for a key, trimmed. */
export function firstValue(
  raw: string | string[] | undefined
): string | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

// Long enough for any real search, short enough that the string never reaches
// Postgres as a multi-kilobyte ILIKE pattern.
export const MAX_SEARCH_LENGTH = 100;

/** Free-text search box value: always a string, never longer than the cap. */
export function searchText(raw: string | string[] | undefined): string {
  return (firstValue(raw) ?? "").slice(0, MAX_SEARCH_LENGTH);
}

/** The value if it is a member of `allowed`, otherwise null. */
export function oneOf<T extends string>(
  raw: string | string[] | undefined,
  allowed: readonly T[]
): T | null {
  const value = firstValue(raw);
  return value && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}
