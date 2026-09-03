# N5Deal Marketplace Prototype

A working marketplace prototype for M&A opportunities and financial assets, built for N5Deal's technical selection process. Three roles — Buyer, Seller, Platform Manager — each with their own flows, backed by a real Postgres database via Prisma/Supabase.

**Live demo:** [n5deal-marketplace-three.vercel.app](https://n5deal-marketplace-three.vercel.app/sign-in) — sign in with any of the [demo credentials](#demo-credentials) below, no setup required.

## Getting Started

1. Clone the repo.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env.local` and fill in the values:
   - `DATABASE_URL` — Supabase connection pooler, port `:6543`, with `?pgbouncer=true&connection_limit=1`
   - `DIRECT_URL` — Supabase direct connection, port `:5432` (used for migrations)
   - `BETTER_AUTH_SECRET` — generate with `npx --yes @better-auth/cli@latest secret`
   - `BETTER_AUTH_URL` — the app's own origin, e.g. `http://localhost:3000` locally
   - `ANTHROPIC_API_KEY` — powers the AI search feature; optional, the app degrades gracefully to plain text search if it's absent
4. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```
5. Seed the database:
   ```bash
   npx prisma db seed
   ```
6. Start the dev server:
   ```bash
   npm run dev
   ```

## Demo Credentials

Three seed accounts, all with the same password `demo1234`:

| Email | Role |
|---|---|
| `buyer@demo.com` | Buyer |
| `seller@demo.com` | Seller |
| `manager@demo.com` | Platform Manager |

Quick-login buttons for all three are available on the sign-in page.

The seed also creates 9 additional accounts (`@demo.com`, same password) so the buyer/seller lists and match scores have a realistic spread rather than 3 lonely rows. One of them, `buyer.silva@demo.com`, was deliberately left without a profile — it's the only way to see the "no-profile" fallback (no match badges, a prompt to complete the profile) on both `/buyer/assets` and `/seller/buyers`.

## Key Technical Decisions

- **Next.js App Router + Server Components as the default.** Most screens are pure server-rendered reads with no client-side data cache — simpler than wiring up a client store for data that a Server Component can fetch directly, and it keeps list state shareable via the URL (see below).
- **Server Actions for all mutations instead of REST route handlers.** One typed function per mutation, re-validated with the same Zod schema the client form used. Avoids hand-rolling request parsing/response shaping for a dozen endpoints that only this app ever calls. The only two route handlers in the app are Better Auth's catch-all and the AI search endpoint, both of which genuinely need to be `fetch`-able JSON endpoints.
- **Three-layer access control** (`proxy.ts` → role layout → Server Action). The Edge-runtime proxy can only check for a session cookie's presence (Prisma needs Node APIs). Role and status checks happen in the role layout for pages, and again in every Server Action, because an action can be invoked directly and a page guard alone would not protect it.
- **Better Auth with the Prisma adapter over NextAuth or a custom auth system.** It gives email/password, session cookies, and a Prisma-backed user model out of the box, and a known-working setup already existed in a sibling project to port from — cheaper and more reliable than building session handling from scratch under a 24h budget.
- **Money stored as `Int` (whole EUR), not `Decimal`.** `Decimal` is a class instance in Prisma's client and throws when passed across the Server Component boundary. A single currency with no fractional cents is a reasonable simplification for a prototype, so plain integers avoid the problem entirely.
- **Deterministic, rule-based matching instead of an ML model.** `computeMatchScore` combines three weighted signals (region, industry, budget fit) into a fixed score. It's explainable, reproducible on every review run, and appropriate for the amount of seed data available — an ML model would need far more data to outperform it and would make demo runs non-reproducible.
- **One LLM feature (AI search) that degrades gracefully.** Natural-language query parsing is additive: every failure mode (missing key, timeout, bad JSON, schema mismatch) falls back to treating the input as plain text search. The demo's core flows never depend on the AI call succeeding.
- **Soft delete (`SUSPENDED`/`REMOVED`) with application-level cascade.** Nothing is ever deleted from the database, which preserves an audit trail and sidesteps FK-cascade complexity. When a Manager suspends or removes a Seller, one Prisma transaction updates the user and bulk-updates their listings together, rather than relying on a DB-level cascade rule.
- **URL as filter state (`searchParams`) instead of a client store.** Filters, search, and sort survive a refresh and are shareable/linkable for free, and it lets list pages stay Server Components instead of hydrating a client-side filter store.

## Assumptions

1. Full authentication with three seeded accounts was implemented, rather than a no-login role switcher, since a real login flow is closer to how the assignment frames the roles.
2. `Asset` fields were modeled from the brief's broader "M&A opportunities and financial assets" framing rather than copied 1:1 from the narrower license-trading reference site.
3. An `Asset.category` field (License / Operating Business / Stake) was added because the written brief covers more than pure license trading, even though the reference site doesn't distinguish categories.
4. The Buyer↔Seller contact flow is a single `Inquiry` record (message + timestamp) per contact, not a live chat thread, since the brief only asks to "contact" a party, not to converse with them.
5. Only Buyers get a structured profile (industries, regions, budget); Sellers get one optional `companyName` field, since the brief only asks Buyers to "describe their investment/acquisition interests."
6. `SUSPENDED` was treated as a reversible soft block and `REMOVED` as a soft delete, both cascading to a Seller's assets at the application level rather than via a database cascade rule.
7. Money is stored as a whole-EUR integer, not a `Decimal` or float, with a single currency and no conversion — reasonable for a prototype scoped to one market.
8. View counters and favourites, present on the reference site, were intentionally excluded since they aren't in the written brief.
9. Matching was built deterministic and rule-based (rather than ML) so reviewers see reproducible results on every run; the single LLM feature is additive and never blocks the core flows if it fails.

## AI Tools Used

- **Claude (claude.ai)** — architecture planning, drafting and iterating on `CLAUDE.md` (the project's persistent context/spec) and `plan.md` (the phased roadmap), and working through prompt design for the AI search feature.
- **Claude Code** — implementation of all phases end to end: schema and seed, auth wiring, all three role sections, the matching engine, the AI search endpoint, theming, and this README.

AI tools were used throughout, but every architectural and product decision — data model shape, access-control layering, what to cut, how matching should score, when to fall back on the AI feature — was made deliberately and is recorded with its reasoning in `CLAUDE.md`, not left to whatever the tool produced first.

## What I Would Improve With More Time

- **Self-registration flow.** Sign-up is closed and the app ships with seed accounts only; a real product needs Buyers and Sellers to be able to join themselves.
- **Real-time inquiry notifications** (Supabase Realtime or WebSockets) instead of a Sent/Received list a user has to check manually.
- **Multi-language support (EN/UA)** — the approach was thought through but not implemented in this pass.
- **Email notifications via Resend** for new inquiries and moderation actions, so a user doesn't have to be signed in to find out something happened.
- **More sophisticated matching** — a weighted/learned scoring model once there's enough real inquiry/outcome data to train against, instead of the fixed rule weights used now.
- **Full test coverage beyond `computeMatchScore`** — Server Actions and the filter-parsing helpers would benefit most from unit tests next.
