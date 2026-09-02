// The only LLM call in the app. Turns a free-text query ("licensed fintech in
// Portugal under 2M") into the same filter shape `AssetFilters` already uses,
// so the buyer filter bar can write the result straight into `searchParams`
// with no translation layer (CLAUDE.md → AI feature).
//
// Second route handler in the app besides Better Auth's catch-all — every
// other mutation is a Server Action (CLAUDE.md → Conventions).
//
// Hard requirement: never throw, never break the page. Every failure past
// authentication and request validation — API error, timeout, non-JSON text,
// schema mismatch — resolves to a 200 `{ fallback: true, search: query }` so
// the client has one uniform branch instead of also having to handle a
// non-2xx response. Authentication and a malformed body ARE genuine non-2xx
// errors: they are protocol-level, not AI-mechanics failures, and the client
// only ever sends a well-formed, authenticated request in normal use.

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth-guard";
import { COUNTRIES, INDUSTRIES } from "@/lib/taxonomy";

const requestSchema = z.object({
  query: z.string().min(1).max(300),
});

// Each field is individually forgiving (`.catch(undefined)` treats an
// invalid value as absent) rather than the whole object failing together —
// the same "drop, don't reject" rule `search-params.ts` applies to a
// hand-edited URL. One bad field (a stray `priceMin: 0`) would otherwise
// throw away five good ones and send a correctly-parsed query into the
// fallback note it didn't earn.
const parsedFiltersSchema = z.object({
  search: z.string().optional().catch(undefined),
  country: z.string().optional().catch(undefined),
  industry: z.string().optional().catch(undefined),
  category: z
    .enum(["LICENSE", "OPERATING_BUSINESS", "STAKE"])
    .optional()
    .catch(undefined),
  priceMin: z.number().int().positive().optional().catch(undefined),
  priceMax: z.number().int().positive().optional().catch(undefined),
});

// `country`/`industry` are enumerated exactly (not just described) so the
// model returns a string `parseAssetFilters` can actually match — without
// this it would freely write "Western Europe" or "Crypto", both of which
// read the query correctly but fail the exact-match `oneOf()` check in
// filters.ts and vanish from the URL with no signal to the user. The
// instruction to omit rather than guess is what keeps an unmappable region
// or synonym out of `country`/`industry` in the first place, rather than
// relying on the client to catch it after the fact.
const SYSTEM_PROMPT = `You are a search query parser for an M&A marketplace.
Extract filter parameters from the user's natural language query.
Return ONLY a valid JSON object with these optional fields:
search (string), country (string), industry (string),
category (LICENSE | OPERATING_BUSINESS | STAKE),
priceMin (integer EUR), priceMax (integer EUR).

"country" must be exactly one of: ${COUNTRIES.join(", ")}.
"industry" must be exactly one of: ${INDUSTRIES.join(", ")}.
If the query names a broader region, group or synonym that isn't exactly one
of these values (e.g. "Western Europe", "crypto"), omit that field rather
than guessing — the original wording can still go in "search".

Return only fields that are clearly mentioned.
Return {} if nothing specific is mentioned.
Return raw JSON only — no markdown, no explanation.`;

const REQUEST_TIMEOUT_MS = 8_000;

// Zero-arg constructor reads ANTHROPIC_API_KEY from the environment. An
// absent/invalid key throws on the first call, which the catch below turns
// into the fallback response — not at module load.
const client = new Anthropic();

// Models occasionally wrap JSON in a fence despite being told not to; strip
// it rather than let a well-formed answer fail JSON.parse for a formatting
// slip.
function stripCodeFence(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
}

export async function POST(request: Request) {
  // Unauthenticated by default would make this a free proxy to a paid API —
  // every other mutation in the app sits behind requireRole() (CLAUDE.md →
  // Access control has three layers), and a route handler is no exception
  // just because it isn't a Server Action. getSessionUser() is used instead
  // of requireRole()/requireUser(): both redirect() on failure, which is
  // right for a page but would hand this fetch caller a 307 instead of JSON.
  const user = await getSessionUser();
  if (!user || user.role !== "BUYER" || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = requestSchema.safeParse(await request.json().catch(() => null));

  if (!body.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { query } = body.data;

  try {
    // No `temperature` here on purpose: current-generation models (Sonnet 5
    // included) reject the sampling parameters (temperature/top_p/top_k)
    // with a 400 — every request would fail closed into the fallback before
    // the model ever ran. Determinism for this task comes from the exact
    // taxonomy enumerated in the prompt above, not from sampling controls.
    const response = await client.messages.create(
      {
        model: "claude-sonnet-5",
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: query }],
      },
      { timeout: REQUEST_TIMEOUT_MS }
    );

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock) throw new Error("No text block in AI response");

    const raw = JSON.parse(stripCodeFence(textBlock.text));
    const parsed = parsedFiltersSchema.parse(raw);

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ fallback: true, search: query });
  }
}
