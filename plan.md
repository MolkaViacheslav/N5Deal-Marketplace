# plan.md — Implementation Roadmap (v2)

Companion to `CLAUDE.md` (architecture, conventions, data model, known pitfalls) and `assignment.md` (original brief). Total budget: ~24h.

## Ordering principles

1. **Deploy the walking skeleton in Phase 0.** Supabase pooling, `prisma generate` on Vercel and env vars are the things that break, and they must break at hour 2, not hour 22.
2. **Buyer browse before Seller forms.** `/buyer/assets` is the screen a reviewer opens first and compares to `n5deal.com/all-listing`. Build it early on seeded data.
3. **Every phase ends deployable.** Push after each phase; never accumulate a big unverified diff.

---

### Phase 0 — Setup + walking skeleton (2h)

- [x] `create-next-app` (TypeScript, App Router, Tailwind, ESLint)
- [x] `shadcn/ui` init + base components (button, card, input, select, dialog, table, badge, form, tabs, sheet, sonner) — *the registry no longer serves `form` for the radix/nova style; `field` (Field/FieldLabel/FieldError) is the substitute, wired to react-hook-form by hand*
- [x] Supabase project; set **both** `DATABASE_URL` (pooler `:6543`, `?pgbouncer=true&connection_limit=1`) and `DIRECT_URL` (`:5432`) — *`DIRECT_URL` actually uses the Session Pooler on `:5432`, not the raw direct host: `db.<ref>.supabase.co` resolves IPv6-only and was unreachable — see CLAUDE.md pitfall*
- [x] `"postinstall": "prisma generate"` in `package.json`
- [x] Prisma init + singleton client in `lib/db.ts` (`src/lib/db.ts` — project uses the `src/` layout)
- [x] Port the Better Auth baseline from `FishLog` (see `CLAUDE.md` → Reference project): `lib/auth.ts`, `lib/auth-client.ts`, `app/api/auth/[...all]/route.ts`, auth models in `schema.prisma`, `middleware.ts`. **Pin the same `better-auth` version.** — *`middleware.ts` → `src/proxy.ts`, Next 16 renamed the file; same semantics*
- [x] Add on top of it: `user.additionalFields` (`role`, `status`, `companyName`) in both the config and the schema, `session.cookieCache`, middleware reduced to a cookie-presence check
- [x] Verify sign-in works end to end before touching the domain model (`cli generate` should not be needed — the models come from the baseline) — *verified at the API level: all 3 seeded users pass `auth.api.signInEmail()` with `role`/`status` present on the session user, and `signUpEmail()` is correctly rejected. The `/sign-in` UI itself is Phase 2.*
- [x] Theme tokens (colors/typography loosely matching the N5Deal reference) — *`--primary` and `--ring` are now a blue-violet indigo (oklch hue 258, cooler than N5deal's ~277 violet — same family, deliberately distinguishable); added a `--success`/`success` Badge variant for Active/Validated states, alongside the existing destructive red; `--radius` bumped 10px→12px for airier card corners. Verified with real screenshots (Playwright, light + dark) rather than just reading the CSS — see CLAUDE.md → Theme.*
- [x] **Deploy to Vercel now**: one page that reads one row from the DB. Do not proceed until the deployed URL renders it. — *https://n5deal-marketplace-three.vercel.app renders live counts from Supabase*

### Phase 1 — Data model + seed (2h)

- [x] Full Prisma schema per `CLAUDE.md`
- [x] `prisma migrate dev`
- [x] `prisma/seed.ts`:
  - users created via `auth.api.signUpEmail()` (NOT `prisma.user.create` — see `CLAUDE.md` → Pitfalls), then patched with `role` / `emailVerified: true` — *changed: self-registration is now enforced off (`disableSignUp: true`), which closes `signUpEmail()` too, so the seed uses `auth.$context.internalAdapter` and sets `role`/`status` directly, no patch step*
  - ~15 assets across all 3 categories, ≥5 countries, ≥6 industries, wide price spread — *18 assets, 9 countries, 10 industries*
  - ~8 buyer profiles with varied industries/regions/budgets so match scores land between 0 and 100, not all-or-nothing
- [x] Run seed against the deployed DB too — *same Supabase instance backs both local dev and the Vercel deployment, so one seed run covers both*

### Phase 2 — Auth + role routing (1.5h)

- [x] Sign-in page (email + password) + quick-login buttons for the 3 seed users — *`src/app/(auth)/sign-in`; the demo buttons sign in outright rather than filling the form, since a reviewer works through all three roles*
- [x] `middleware.ts` — cookie presence only (`getSessionCookie`), redirect to `/sign-in`. No DB, no role logic. — *done early, in Phase 0, as `src/proxy.ts`*
- [x] `lib/auth-guard.ts` → `requireRole(role)`: fetches session, checks role and `status`, redirects. Used in role layouts **and** in every Server Action. — *also `requireUser()` and `getSessionUser()`. `homeFor()`/`safeNextPath()` live in `src/lib/routes.ts` instead — the sign-in form needs `homeFor` and `auth-guard.ts` pulls in Prisma, which must not reach the client bundle*
- [x] `app/buyer/layout.tsx`, `app/seller/layout.tsx`, `app/manager/layout.tsx` calling `requireRole()`
- [x] `/suspended` page for `status !== ACTIVE` — *distinguishes SUSPENDED from REMOVED; sits outside the proxy matcher so a suspended user isn't bounced in a loop*
- [x] Shared app shell: header, role badge, sign-out — *`src/components/layout/app-shell.tsx` + per-role nav from `src/lib/nav-items.ts`*
- [x] **Added, not in the original plan:** thin placeholder pages for the 9 routes the nav links to but Phases 3–6 still have to build (`src/components/layout/phase-placeholder.tsx`). Without them every nav link and every post-sign-in redirect 404s, and a broken guard is indistinguishable from a missing page. Each later phase deletes its placeholder and writes the real screen.

### Phase 3 — Buyer browse (the money screen) (3.5h)

- [x] `components/asset/asset-card.tsx` — badges (category, business status, country), field grid, price, tags. Match the reference layout. — *the badge row and the category-specific field list are extracted (`asset-badges.tsx`, `asset-category-fields.ts`) so the card and the detail page cannot drift into showing different sets; the Phase 5–6 seller/manager screens reuse them too. `MatchBadge` is in the card already but only renders when Phase 7 passes a `matchScore` — absent means no badge, never "0%".*
- [x] `/buyer/assets` — server-side list with filters via `searchParams`: search, country, category, industry, price range — *explicit `select` rather than whole rows: `description` is up to 2000 characters per card and is never rendered here. No `take`/pagination — 18 seeded rows; called out in the README as a deliberate cut.*
- [x] Filter bar as a Client Component writing to `searchParams` (URL is the state → survives refresh, shareable, no client store) — *URL⇄query translation lives in `filters.ts` and every value is validated against `taxonomy.ts`, dropped rather than rejected. The bar renders from the same parsed object the list uses, so it can never display a filter that isn't applied — including the price inputs, which run the parser's own rule before writing. Writes build on the last URL this component issued, not on `useSearchParams()`: `router.replace` runs in a transition, so the hook still returns the pre-navigation params and two quick changes would drop the first.*
- [x] `/buyer/assets/[id]` — detail page, category-specific block, seller info (`await params`) — *the browse filters ride along on the detail URL so "Back to listings" returns to the list the buyer actually had; re-parsed on arrival, so the link can't carry a hand-edited filter back. `findVisibleAsset` is wrapped in `cache()` so the page body and `generateMetadata` agree and a moderated listing can't leak its title through the tab.*
- [x] Empty state when filters match nothing — *two states, not one: "no listings match these filters" (has an action) vs "no listings yet" (doesn't).*

### Phase 4 — Buyer profile + inquiries (2h)

- [x] `/buyer/profile` — create/edit `BuyerProfile` (industries, regions, budget, description) — *one screen for create and edit, since the action upserts. At least one industry or region is required: an all-empty profile would score 0 on every listing in Phase 7, which is a worse answer than the "complete your profile" prompt it would replace.*
- [x] "Contact Seller" dialog on the detail page → `createInquiry` Server Action — *`toUserId` is read off the asset and `fromUserId` off the session, so the payload names a listing, never a person; the asset is re-fetched with the same visibility rule in case it was moderated away since the page rendered.*
- [x] `/buyer/inquiries` — Sent / Received tabs — *tabs are `Link`s reading `?tab=`, not Radix client state, so the tab survives a refresh and is linkable. Each card shows the counterparty's email: an Inquiry is one message and not a thread, so that address is the only way the conversation continues.*
- [x] **Added, not in the original plan:** `<Toaster />` mounted in the root layout. `sonner` was installed in Phase 0 but never rendered, so every `toast()` in this phase was a no-op. Phase 9 still owns the *coverage* of toasts across the app; this is just the renderer that makes them work at all.

### Phase 5 — Seller flows (3h)

- [ ] `/seller/assets` — own listings table, status badges
- [ ] New/Edit asset — **single form**, category `Select` at the top, conditional block via `watch("category")`. Zod discriminated union + `z.coerce`. `sanitizeByCategory()` before update.
- [ ] `/seller/buyers` — buyer list + filters (industry, region, budget)
- [ ] `/seller/buyers/[id]` — profile view + "Contact Buyer"
- [ ] `/seller/inquiries` — Sent / Received

### Phase 6 — Manager flows (1.5h)

- [x] `/manager` — counters + latest audit-log entries — *four stat cards (Total Buyers/Sellers, Active Listings, Suspended+Removed Users) plus a raw Table (Actor/Action/Target Type/Target ID/Date) of the last 10 `AuditLog` rows, sorted desc*
- [x] `/manager/participants` — table, search/filter by role/status, Suspend / Remove / Reactivate — *lists Buyers and Sellers only, per the brief's "see Buyers, Sellers, and Assets"; a clean state machine (Suspend only from ACTIVE, Remove from ACTIVE/SUSPENDED, Reactivate only from SUSPENDED — REMOVED is terminal) decides which actions a row offers*
- [x] `/manager/assets` — table, search/filter, Suspend / Remove — *no Reactivate: `plan.md` and the `AuditAction` enum both scope assets to Suspend/Remove only, so a manually-suspended listing has no path back to ACTIVE in this build — a deliberate scope cut*
- [x] Seller status change cascades to their assets in one Prisma transaction — *Suspend/Remove/Reactivate each bulk-update only the assets that transition matters for (e.g. Reactivate only restores assets left `SUSPENDED` by the cascade, never ones already `REMOVED`), so a manager's direct asset-level Remove is never silently undone*
- [x] Guards: a manager cannot suspend/remove themselves or another manager — *enforced in the Server Actions (`app/manager/{participants,assets}/actions.ts`), not just hidden in the UI*
- [x] `logAction()` writes an `AuditLog` row inside the same transaction — *`lib/audit.ts`; also deletes the target's `Session` rows on Suspend/Remove (CLAUDE.md → Auth) so an open session dies immediately rather than waiting out the 60s cookie cache*

### Phase 7 — Smart Matching (1.5h)

- [ ] `lib/matching.ts` → `computeMatchScore(profile, asset): number` (pure)
- [ ] Vitest + ~6 unit tests: full match, zero match, partial, missing budget bounds, empty arrays, price on the boundary
- [ ] Match badge on asset cards (buyer side) and buyer cards (seller side)
- [ ] "Recommended for you" section + "Best match" sort
- [ ] No-profile fallback: hide badges, show "complete your profile" prompt

### Phase 8 — AI search (1.5h)

- [ ] `POST /api/ai/parse-query` — free-text → `{ search?, country?, industry?, category?, priceMin?, priceMax? }` as strict JSON, validated with Zod
- [ ] Wire it into the existing buyer filter bar: parsed values simply populate `searchParams`, so the whole downstream path is already built and tested
- [ ] Fallback on error/timeout/invalid JSON: treat the input as a plain text search, show a small "AI unavailable, using text search" note. **Demo must never break because of this feature.**
- [ ] Two example chips under the input so a reviewer can try it in one click

### Phase 9 — Polish (2h)

- [ ] Loading states (`loading.tsx` + skeletons on the two list pages)
- [ ] Toasts on every mutation; `revalidatePath` after every Server Action — *the `<Toaster />` itself was mounted in Phase 4, because the code there already called `toast()`; what is left here is coverage across the remaining mutations*
- [ ] Empty states everywhere (no assets, no inquiries, no profile)
- [ ] `error.tsx` + `not-found.tsx`
- [ ] Responsive pass (cards → single column, tables → horizontal scroll)

### Phase 10 — README + final deploy (2h)

- [ ] README: setup, seed credentials, key technical decisions, assumptions, AI tools used, what's next
- [ ] Short architecture section — folder layout, three-layer access control, why Server Actions over route handlers, why deterministic matching + one LLM feature
- [ ] Final deploy + smoke test all 3 roles on the deployed URL, in an incognito window
- [ ] Re-read `assignment.md` line by line and tick off every requirement

### Buffer (1.5h)

Reserved for bugs surfaced in Phases 3–8.

## Cut order if time runs short

Cut strictly from the bottom:

1. `/seller/buyers` filters → plain list
2. AI search (Phase 8) → the deterministic matching still covers "Smart Filtering"
3. `AuditLog` UI on `/manager` (keep the writes — they're two lines)
4. "Recommended for you" section → keep just the badges and the sort

**Never cut:** buyer browse + filters, the asset form, manager suspend/remove, README.

## Stretch (only if everything above is done)

- Self-registration flow
- EN/UA switch: `lang` cookie + `dictionaries/{en,uk}.ts` + `getDictionary()` in server components, no locale routing
- Tests beyond `computeMatchScore` (Zod schema branches, `sanitizeByCategory`)

## Assumptions log (condensed — full reasoning goes in the README)

1. Auth: full Better Auth + 3 seeded users, not a no-login role switcher.
2. `Asset` fields aren't in the brief — modeled from its "M&A opportunities and financial assets" framing, not copied 1:1 from the narrower reference site.
3. `Asset.category` (License / Operating Business / Stake) added — not on the reference site, needed because the written brief is broader than license trading.
4. Contact flow = a single `Inquiry` record, not live chat.
5. The brief gives a profile to Buyer only — Seller gets one optional `companyName` field instead of a full table.
6. `SUSPENDED` = reversible soft block, `REMOVED` = soft delete; both cascade to a Seller's assets at the application level.
7. Money is `Int` in whole EUR, single currency, no conversion.
8. View counters / favourites from the reference site excluded — not in the written brief.
9. Matching is deterministic and rule-based so it's reproducible during review; the one LLM feature (query parsing) is additive and degrades to plain search.
