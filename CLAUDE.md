@AGENTS.md

# CLAUDE.md — N5Deal Marketplace Prototype

Persistent context for Claude Code in this repo. Read it before making changes. The original brief is in `assignment.md`, the phased roadmap is in `plan.md`. If scope changes mid-build, update this file rather than letting it drift.

`AGENTS.md` (referenced above) is generated and re-added by `next dev` — it is not hand-written; leave it alone.

## Where this stands

Phases 0–4 are done; **Phase 5 (seller flows) is next**, and Phase 6 (manager) is being built in parallel in a second worktree. `plan.md` carries the live checkboxes — it is the source of truth for what is finished, and items done differently from the original plan carry an inline italic note explaining why.

What exists: the Better Auth + Prisma wiring, the full schema and seed, sign-in at `/sign-in`, `requireRole()` guards on all three role layouts, `/suspended`, the signed-in shell (header, per-role nav, role badge, sign-out), and the whole Buyer section — browse with URL-driven filters, listing detail, profile, inquiries.

**The five remaining role routes are placeholders.** `src/app/{seller,manager}/**/page.tsx` render `<PhasePlaceholder>` — routing, guards and chrome are real, the screens are not. Each phase from 5 onward replaces its own placeholder file. `src/app/page.tsx` is likewise a throwaway proof page until Phase 9.

Reusable pieces the seller and manager screens should not rebuild:

- `src/components/asset/` — `AssetBadges` (category / business status / country), `AssetCard`, `categoryFacts()`. Role-neutral by design: a manager's asset table renders the *same* category badge as buyer browse, so use `CategoryBadge` rather than a local `<Badge variant="outline">`.
- `src/lib/action-result.ts` — the `ActionResult` union every Server Action returns. Failures are values, not throws (Next redacts thrown messages in a production build).
- `src/app/buyer/assets/filters.ts` — the pattern for `searchParams` ⇄ query translation: validate against `taxonomy.ts`, drop what doesn't fit, and render the controls from the parsed object so the bar can never show a filter the list isn't applying.

## Operations

| | |
|---|---|
| Repo | `github.com/MolkaViacheslav/N5Deal-Marketplace` (branch `main`) |
| Vercel project | `molka2/n5deal-marketplace` — auto-deploys on push to `main` |
| Production | https://n5deal-marketplace-three.vercel.app |
| Database | Supabase, region `eu-central-1` |

> [!WARNING]
> **Local development and production share one Supabase database.** There is no separate dev instance. `npm run db:seed` **truncates every table** — running it casually wipes the live demo. It is safe today only because the demo data is disposable; treat it as a destructive command, and never point it at anything else.

Migrations are applied **manually from a local machine** (`npm run db:migrate`). The Vercel build only runs `prisma generate` via `postinstall` — there is no `migrate deploy` step in CI, so a schema change is not live until someone runs the migration by hand.

Environment variables on Vercel:

| Variable | production | preview | development |
|---|:---:|:---:|:---:|
| `DATABASE_URL` | ✓ | ✓ | ✓ |
| `DIRECT_URL` | ✓ | ✓ | ✓ |
| `BETTER_AUTH_SECRET` | ✓ | ✓ | ✓ |
| `BETTER_AUTH_URL` | ✓ | — | — |
| `NEXT_PUBLIC_APP_URL` | ✓ | — | — |

The two URL variables are deliberately production-only: preview deployments get a fresh hostname each time, so a pinned URL would break auth there. Left unset, Better Auth derives the origin from the incoming request and the auth client falls back to same-origin — which is correct for previews. Do not "fix" this by setting them for preview.

Locally, copy `.env.example` → `.env` and fill it in; `.env` is gitignored *and* `.vercelignore`d, because `vercel deploy` uploads the working directory rather than the git tree. (`.env.example` itself needs the `!.env.example` negation in `.gitignore` to survive the `.env*` pattern.)

Commands: `npm run dev` · `build` · `lint` · `test` (Vitest) · `db:migrate` · `db:seed` · `db:studio`.

Tooling state on the original machine, in case it needs redoing under a different account: the `vercel` CLI is installed globally via npm and logged in as `molkaviacheslav` (`vercel whoami`; re-auth with `vercel logout && vercel login`). Pushes to GitHub go through Git Credential Manager. The `gh` CLI was installed but **never** successfully authenticated — nothing depends on it.

## Project

Take-home assignment for N5Deal — a working marketplace prototype for M&A opportunities and financial assets, with three roles (Buyer / Seller / Platform Manager), within a ~24h effort budget. Not production-ready; optimized for demonstrating product and engineering judgment on an intentionally under-specified brief.

## Stack

- Next.js 16, App Router, TypeScript (strict), `src/` layout
- Prisma 7 + PostgreSQL (Supabase)
- Better Auth 1.6.23 (Prisma adapter, email + password) — version pinned to match the FishLog baseline
- shadcn/ui + Tailwind CSS
- Zod 4 for all mutation input validation
- Vitest for unit tests
- Deploy: Vercel (app) + Supabase (DB)

## Known pitfalls — read before writing code

These are the things that will otherwise cost hours.

1. **Better Auth cannot run in the proxy layer.** Next 16 renamed `middleware.ts` → **`src/proxy.ts`** (same Edge runtime, same semantics; the old name still builds but warns). `auth.api.getSession()` needs Prisma, which needs Node APIs, which don't exist on the Edge. `proxy.ts` checks only for the presence of a session cookie (`getSessionCookie`). All role and status logic lives in server-side layouts and Server Actions.
2. **Seed users must be created through Better Auth, and `signUpEmail()` is closed.** `prisma.user.create()` with a password won't produce a login-able account — Better Auth keeps its own scrypt hash in `Account.password`. And because self-registration is enforced off (`disableSignUp: true`), `auth.api.signUpEmail()` throws too. The seed uses the layer underneath: `const ctx = await auth.$context`, then `ctx.internalAdapter.createUser({...})` + `ctx.internalAdapter.linkAccount({ userId, providerId: "credential", accountId: user.id, password: await ctx.password.hash(pw) })`. That is exactly what the sign-up endpoint calls once past its own guard. `role`/`status` can be passed straight into `createUser` — the `input: false` flag only gates the HTTP payload.
3. **Money is `Int` (whole EUR), never `Decimal`.** Prisma's `Decimal` is a class instance and throws `Only plain objects can be passed to Client Components` when it crosses the RSC boundary. Format at render with `Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })`.
4. **Supabase needs two connection strings, and the "direct" one probably won't work.** `DATABASE_URL` = Transaction Pooler on `:6543` with `?pgbouncer=true&connection_limit=1` (runtime). `DIRECT_URL` = session-scoped connection for migrations. In Prisma 7 both are wired in `prisma.config.ts`, not in the `datasource` block. Add `"postinstall": "prisma generate"` or Vercel builds with a stale client.

   **The trap:** Supabase's direct host `db.<ref>.supabase.co:5432` publishes an **AAAA (IPv6) record only**. On an IPv4-only network `prisma migrate` dies with `P1001: Can't reach database server`, and the message points at the host as if it were down. Use the **Session Pooler** instead — same pooler host as `DATABASE_URL`, port `:5432`, no `pgbouncer` flag. It is IPv4-reachable and, unlike the Transaction Pooler on `:6543`, supports the session-scoped connections and advisory locks migrations need. Diagnose with `Resolve-DnsName db.<ref>.supabase.co` (AAAA only = this problem).
5. **A Prisma read does not make a route dynamic.** Next only auto-detects `fetch`, `headers()`, `cookies()`, `searchParams` etc. A page that only calls `prisma.*` gets **statically prerendered at build time**: the data freezes at build, and the build itself starts requiring DB access (a Supabase hiccup then fails the deploy). Any page reading live data needs `export const dynamic = "force-dynamic";`. Check `next build` output — it must say `ƒ (Dynamic)`, not `○ (Static)`. This applies to every list and detail page in Phases 3–6.

   The role layouts (`src/app/{buyer,seller,manager}/layout.tsx`) don't carry this export and don't need it: `requireRole()` calls `headers()` (via `getSessionUser()`), which **is** on Next's dynamic-API list, and a dynamic call anywhere in a route's layout/page tree makes the whole route dynamic — confirmed in the `next build` output (all three sections list as `ƒ`). `/sign-in` and `/suspended` carry the export explicitly anyway, since it costs nothing and they'll keep reading the session even if that call path ever changes. Don't add it reflexively to every guarded route; add it where the page's *own* dynamic behavior isn't already guaranteed by something upstream.
6. **Next.js 16: `params` and `searchParams` are Promises.** Always `const { id } = await params;`.
7. **Form inputs are strings.** Use `z.coerce.number()`, never bare `z.number()`. For optional numbers use the `optionalInt` helper below — `z.coerce.number().optional()` turns `""` into `0`.
8. **`revalidatePath` after every mutation**, otherwise the RSC cache serves stale lists.
9. **Prisma client singleton** in `src/lib/db.ts` guarded by `globalThis` — dev hot reload otherwise exhausts connections.
10. **Prisma 7 has no bundled query engine.** Connections go through a *driver adapter*: `new PrismaPg({ connectionString: process.env.DATABASE_URL })` passed as `adapter` to `PrismaClient`. Requires `@prisma/adapter-pg` + `pg`.
11. **shadcn no longer ships a `form` component** for this style (`radix` base, `nova` preset — see `components.json`). `npx shadcn@latest add form` silently does nothing. The replacement is `field` (`Field`, `FieldLabel`, `FieldError`, `FieldGroup`, already installed in `src/components/ui/field.tsx`) — presentational only, so react-hook-form is wired by hand with `Controller`/`register` rather than through a `FormField` wrapper. Registry items need the namespace: `npx shadcn@latest add '@shadcn/<name>'`.
12. **`create-next-app` writes its own `CLAUDE.md`** (a one-line `@AGENTS.md` pointer). Never move/copy a scaffold over this directory with `-Force`; it will clobber this file.
13. **npm 11 blocks install scripts by default.** `prisma`, `@prisma/engines`, `esbuild` and `unrs-resolver` are approved in `package.json` → `allowScripts`. A new dependency with a postinstall hook will warn until it's approved too.
15. **`tsx` runs `.ts` here as CommonJS, so top-level `await` is a build error** (`Top-level await is currently not supported with the "cjs" output format`). `package.json` has no `"type": "module"`. Any script under `prisma/` must use `.then()/.finally()` chains, not top-level await — this is why `prisma/seed.ts` resolves `auth.$context` through a lazy getter.
16. **`session.user.role` and `.status` are typed `string | null | undefined`.** `additionalFields` declared `required: false` widens them, even though both columns are non-nullable with defaults. Helpers that take them (`homeFor`) accept the loose type and fall back, rather than being called with a cast at each site.
17. **Route-type generics (`PageProps<"/x">`, `LayoutProps<"/x">`) resolve only after Next regenerates `.next/types`.** A brand-new route makes `tsc --noEmit` fail with `Type '"/x"' does not satisfy the constraint '"/"'` until `next build` (or `next dev`) has run once. Build first, then trust the typecheck.
18. **Better Auth rejects `POST /api/auth/*` without an `Origin` header** (403) and without `Content-Type: application/json` (415). Browsers send both, so this only bites when testing with `curl` — add `-H "Origin: http://localhost:3000" -H 'Content-Type: application/json'` or you will misdiagnose working CSRF protection as a broken endpoint.
19. **Never pipe a value into `vercel env add` from PowerShell.** `$value | vercel env add NAME production` prepends a UTF-8 BOM (`﻿`) to the stdin PowerShell hands the child process. It's invisible in `vercel env ls`, but `new URL("﻿https://...")` throws, and a BOM-prefixed connection string fails to parse — this took down every env var set this way in one shot (`Invalid base URL`, Prisma `Can't reach database server`). Use Bash: `printf '%s' "$value" | vercel env add NAME production`. To audit a suspect value: `vercel env pull .env.check --environment production --yes` then `xxd` the line — a real value starts `NEXT_PUBLIC_APP_URL="h...`, a corrupted one starts with the 3 bytes `ef bb bf` before the `h`.

## Conventions

- Default to Server Components. Every mutation is a Server Action; no REST route handlers except `/api/auth/[...all]` and `/api/ai/parse-query`.
- Server Actions take a typed object, not `FormData`. React Hook Form already produces a validated object client-side; the action re-validates with the same Zod schema server-side.
- Every mutation input is validated with Zod before it touches Prisma.
- Access control has three layers: `proxy.ts` (cookie present) → role layout (`requireRole()`) → Server Action (`requireRole()` again). A Server Action can be invoked directly, so the route guard alone is never enough.
- List state (search, filters, sort, page) lives in `searchParams`, not client state — it survives refresh, is shareable, and lets the page stay a Server Component.
- Folder layout: `src/app/(auth)/...`, `src/app/buyer/...`, `src/app/seller/...`, `src/app/manager/...`; shared primitives in `src/components/ui` (shadcn), domain components in `src/components/<domain>`; pure logic in `src/lib/`.

## Roles & Routes

- **Seller** — `/seller/assets`, `/seller/assets/new`, `/seller/assets/[id]/edit`, `/seller/buyers`, `/seller/buyers/[id]`, `/seller/inquiries`
- **Buyer** — `/buyer/assets`, `/buyer/assets/[id]`, `/buyer/profile`, `/buyer/inquiries`
- **Manager** — `/manager`, `/manager/participants`, `/manager/assets`

Each role layout calls `requireRole()`, which redirects a mismatched role to its own dashboard root and any non-`ACTIVE` user to `/suspended`. `getSessionUser()`/`requireUser()`/`requireRole()` build on each other rather than being one function — a page that only needs "is anyone signed in" (e.g. a route shared across roles) has no reason to also assert a specific role.

```ts
// src/lib/auth-guard.ts — actual shape; requireRole calls requireUser calls getSessionUser
export const getSessionUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null; // never redirects — for guest-aware pages
});

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (user.status !== "ACTIVE") redirect("/suspended"); // treats a missing
  // status as "not active" — fail closed, not a bug: an auth guard that
  // treats an unexpectedly-absent status as ACTIVE would be the actual hole.
  return user;
}

export async function requireRole(role: Role) {
  const user = await requireUser();
  if (user.role !== role) redirect(homeFor(user.role));
  return user;
}
```

## Reference project — FishLog (auth only)

`FishLog` is a separate personal project by the same author, present in the same VS Code workspace. It contains a **known-working Better Auth + Prisma setup on Next.js App Router**. Use it as the baseline for auth instead of writing one from scratch.

**Read only these files, and only for auth:**

- `src/server/lib/auth.ts` — server instance
- `src/features/auth/lib/auth-client.ts` — client instance
- `src/app/api/auth/[...all]/route.ts` — handler
- the Better Auth models in `prisma/schema.prisma`
- `prisma.config.ts`
- the `better-auth` version in `package.json` → **pinned here: 1.6.23**

FishLog has **no `middleware.ts`/`proxy.ts`** — ours is written from scratch (cookie-presence check via `getSessionCookie`).

**Rules:**

- `FishLog` is read-only. Never create, edit or delete anything inside it.
- Do not read the rest of it. Its domain model, pages and components are unrelated to this project and will pull the design in the wrong direction.
- **Do not port its architecture.** FishLog uses TanStack Query and a services/repositories layer; N5Deal uses Server Components + Server Actions with no client-side data cache and no repository layer. Copy the auth wiring, not the patterns around it.
- Adapt the baseline, don't rewrite it. If something in it looks improvable, leave it — it is known to work with the pinned version.

**Changes required on top of the baseline** (FishLog almost certainly lacks these):

- `user.additionalFields`: `role`, `status`, `companyName` — declared in the Better Auth config **and** in `prisma/schema.prisma`
- `session.cookieCache` enabled
- `src/proxy.ts` — cookie-presence check only; all role/status logic lives in `requireRole()` in role layouts and Server Actions
- seed script that creates users through `auth.$context.internalAdapter` (see pitfall 2 — `signUpEmail()` is closed by `disableSignUp`)

## Auth

Better Auth generates `User`, `Session`, `Account`, `Verification` via `npx @better-auth/cli generate`. Don't hand-edit those beyond the `additionalFields` on `User` (`role`, `status`, `companyName`), which must be declared **both** in the Prisma schema and in the Better Auth config's `user.additionalFields` — otherwise they won't appear on `session.user`. `role` and `status` carry `input: false` so they can never be set from a sign-up payload.

On the client, `createAuthClient` needs `inferAdditionalFields<typeof auth>()` or the browser-side `session.user` type is missing those three fields even though the server sends them.

`session.cookieCache` is enabled to avoid a DB hit per request, with **`maxAge: 60`** rather than the 5-minute default. The cache holds `status`, so a Manager's Suspend takes up to `maxAge` to bite on an already-open session; suspend/remove also deletes that user's `Session` rows so the session dies the moment the cookie cache lapses. A fresh sign-in is blocked immediately regardless.

The three demo logins the README will hand a reviewer — password **`demo1234`** for every seeded account:

- `buyer@demo.com` — `BUYER`
- `seller@demo.com` — `SELLER`
- `manager@demo.com` — `MANAGER`

The sign-in page has quick-login buttons for these three alongside the normal form.

The seed creates **12 users in total**, not 3: the marketplace needs populated lists. Alongside the three above there are 2 more sellers (`seller.lisbon@`, `seller.tallinn@`) and 7 more buyers (`buyer.hansen@`, `.moreau@`, `.rossi@`, `.novak@`, `.okafor@`, `.silva@`, `.zielinska@`), all `@demo.com` with the same password. They exist so `/seller/buyers` and the manager tables have real rows and so match scores show a spread.

## Data Model (Prisma)

```prisma
generator client {
  // Prisma 7: the "prisma-client" generator (ESM), output committed to .gitignore
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  // Connection URLs come from prisma.config.ts:
  //   DATABASE_URL — pooled, :6543 (?pgbouncer=true&connection_limit=1)
  //   DIRECT_URL   — direct, :5432 — migrations only
}

// ---------- Better Auth managed models ----------

enum Role {
  BUYER
  SELLER
  MANAGER
}

enum UserStatus {
  ACTIVE
  SUSPENDED
  REMOVED
}

model User {
  id            String     @id // generated by Better Auth
  name          String
  email         String     @unique
  emailVerified Boolean    @default(false)
  image         String?
  role          Role       @default(BUYER)
  status        UserStatus @default(ACTIVE)
  companyName   String?    // Seller-only, optional. No SellerProfile table — see Assumptions.
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  sessions Session[]
  accounts Account[]

  buyerProfile      BuyerProfile?
  assets            Asset[]    @relation("SellerAssets")
  sentInquiries     Inquiry[]  @relation("InquiriesFrom")
  receivedInquiries Inquiry[]  @relation("InquiriesTo")
  auditActions      AuditLog[] @relation("AuditActor")

  @@index([role, status])
  @@map("user")
}

model Session {
  id        String   @id
  expiresAt DateTime
  token     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("session")
}

model Account {
  // Shape taken verbatim from the working FishLog baseline. Note the token
  // expiry columns are `accessTokenExpiresAt` / `refreshTokenExpiresAt`,
  // NOT a single `expiresAt`, and `scope` is required by the adapter.
  id                    String    @id
  accountId             String
  providerId            String
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  password              String?
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@map("account")
}

model Verification {
  id         String   @id
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@map("verification")
}

// ---------- Domain models ----------

model BuyerProfile {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  industries  String[]
  regions     String[]
  budgetMin   Int?     // whole EUR
  budgetMax   Int?
  description String?
  updatedAt   DateTime @updatedAt
}

enum AssetCategory {
  LICENSE
  OPERATING_BUSINESS
  STAKE
}

enum BusinessStatus {
  ACTIVE
  DORMANT
  IN_LIQUIDATION
}

enum ListingStatus {
  ACTIVE
  SUSPENDED
  REMOVED
}

model Asset {
  id       String @id @default(cuid())
  sellerId String
  seller   User   @relation("SellerAssets", fields: [sellerId], references: [id])

  // Common fields — every category
  title             String
  category          AssetCategory
  country           String
  industry          String
  businessStatus    BusinessStatus @default(ACTIVE)
  askingPrice       Int            // whole EUR
  employees         String?
  yearFounded       Int?
  description       String
  keyAssetsIncluded String[]
  listingStatus     ListingStatus  @default(ACTIVE)
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  // LICENSE-only (required when category = LICENSE — enforced in Zod, not in Prisma)
  regulatoryBody String?
  licenseType    String?

  // OPERATING_BUSINESS-only
  annualRevenue Int?
  reasonForSale String?

  // STAKE-only
  stakePercentage Int?
  // annualRevenue is reused here — a stake sale still has a revenue figure

  inquiries Inquiry[]

  @@index([listingStatus, category, country])
  @@index([sellerId])
}

model Inquiry {
  id         String   @id @default(cuid())
  fromUserId String
  from       User     @relation("InquiriesFrom", fields: [fromUserId], references: [id])
  toUserId   String
  to         User     @relation("InquiriesTo", fields: [toUserId], references: [id])
  assetId    String?
  asset      Asset?   @relation(fields: [assetId], references: [id])
  message    String
  createdAt  DateTime @default(now())

  @@index([toUserId, createdAt])
  @@index([fromUserId, createdAt])
}

enum AuditAction {
  SUSPEND_USER
  REMOVE_USER
  REACTIVATE_USER
  SUSPEND_ASSET
  REMOVE_ASSET
}

model AuditLog {
  id         String      @id @default(cuid())
  actorId    String
  actor      User        @relation("AuditActor", fields: [actorId], references: [id])
  action     AuditAction
  targetType String      // "USER" | "ASSET"
  targetId   String
  reason     String?
  createdAt  DateTime    @default(now())

  @@index([createdAt])
}
```

Naming note: `businessStatus` describes the company being sold; `listingStatus` describes the listing's moderation state. Don't conflate them.

### Asset validation (Zod discriminated union)

Category-specific fields are nullable at the DB level and required-by-category at the validation level.

```ts
const optionalInt = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.number().int().positive().optional()
);

const baseAssetSchema = z.object({
  title: z.string().min(3).max(120),
  country: z.string().min(2),
  industry: z.string().min(2),
  businessStatus: z.enum(["ACTIVE", "DORMANT", "IN_LIQUIDATION"]),
  askingPrice: z.coerce.number().int().positive(),
  employees: z.string().max(40).optional(),
  yearFounded: optionalInt,
  description: z.string().min(20).max(2000),
  keyAssetsIncluded: z.array(z.string().min(1)).max(10).default([]),
});

export const assetSchema = z.discriminatedUnion("category", [
  baseAssetSchema.extend({
    category: z.literal("LICENSE"),
    regulatoryBody: z.string().min(1),
    licenseType: z.string().min(1),
  }),
  baseAssetSchema.extend({
    category: z.literal("OPERATING_BUSINESS"),
    annualRevenue: z.coerce.number().int().positive(),
    reasonForSale: z.string().max(500).optional(),
  }),
  baseAssetSchema.extend({
    category: z.literal("STAKE"),
    stakePercentage: z.coerce.number().int().min(1).max(100),
    annualRevenue: optionalInt,
  }),
]);
```

**UI:** one form, not a wizard. `category` is a `Select` at the top; the matching field block renders below via `watch("category")`. A multi-step form fights `zodResolver` on a discriminated union (it validates the whole object at once) and buys nothing here.

**Edge case — category change on edit:** run `sanitizeByCategory(input)` before `prisma.asset.update()`, explicitly setting the other branches' fields to `null`. Otherwise a listing that used to be a `LICENSE` keeps rendering its old `regulatoryBody` after becoming a `STAKE`.

## Smart Matching

Deterministic and rule-based, so it produces identical results on every review run. Pure function in `src/lib/matching.ts`, called server-side at render time — no background job at this scale.

`computeMatchScore(profile, asset): number`

- `asset.country ∈ profile.regions` → 35
- `asset.industry ∈ profile.industries` → 35
- `asset.askingPrice` within `[budgetMin, budgetMax]` → 30

Missing criteria (empty array, null budget bound) score 0 for that component rather than being treated as a wildcard — an empty profile must not read as a 100% match. An open-ended bound (`budgetMax` null) counts as satisfied on that side only.

Surfaced as: a % badge on asset cards in `/buyer/assets`, a "Recommended for you" section, the reciprocal view on `/seller/buyers`, and a "Best match" sort on both.

**No-profile fallback:** a Buyer without a `BuyerProfile` sees no badges, no "Recommended" section, and a prompt linking to `/buyer/profile`.

## AI feature — natural-language search

The only LLM call in the app. `POST /api/ai/parse-query` turns free text ("licensed fintech in Portugal under 2M") into `{ search?, country?, industry?, category?, priceMin?, priceMax? }`, validated with Zod, then written into `searchParams` so it reuses the filtering path that already exists.

**Hard requirement:** every failure path (error, timeout, non-JSON, schema mismatch) falls back to treating the input as a plain text search, with a small inline note. The demo must never be broken by this feature.

## Manager actions — Suspend vs Remove

- **Suspend** (`SUSPENDED`): reversible soft block. The user is redirected to `/suspended` on their next request; their assets disappear from Buyer browse but are not deleted.
- **Remove** (`REMOVED`): soft delete. Hidden everywhere, data retained — keeps an audit trail and avoids FK-cascade complexity. Not reversible from the UI.
- Suspending or removing a **Seller** cascades at the **application level**: one Prisma transaction updates `User.status`, bulk-updates that seller's `Asset.listingStatus`, and writes an `AuditLog` row. Nothing is deleted from the database.

**Guards:** a manager cannot change their own status, and cannot suspend or remove another manager. Both checks live in the Server Action.

## Theme

Tokens live in `src/app/globals.css` (`:root` / `.dark`), oklch, shadcn's `radix`/`nova` preset as the base. Loosely follows the N5deal reference (`n5deal.com/all-listing`) rather than copying it — per the assignment, "you do not need to reproduce it 1:1":

- **`--primary` / `--ring`**: a blue-violet indigo, `oklch(0.47 0.19 258)` light / `oklch(0.64 0.19 258)` dark. N5deal's accent sits around hue ~277 (more violet); ours is pulled to hue 258 (cooler, more blue) so it reads as the same family without being a clone. Used for CTAs, links, and the asking-price figure on asset cards.
- **`--success` / `success` Badge variant**: new, not in shadcn's default set. N5deal shows "Active" / "Validated" in green and "Not active" in red — the red half already existed as `--destructive`; green didn't, so it was added the same way (`bg-success/10 text-success`, matching the existing `destructive` variant's soft-tint pattern rather than a solid fill).
- **Surfaces stay true neutral** (chroma 0) — N5deal tints its field-chip backgrounds faintly blue; here the one saturated brand color carries the identity and gray stays gray. Simpler, and it's the deliberate "trochy inakshyi" (slightly different) requested when this was built.
- **`--radius`**: 10px → 12px, closer to the reference's airier card corners.
- Font stays Geist (`src/app/layout.tsx`) — not chasing the reference's typeface from a screenshot alone.

**Verifying a token or component-style change:** `tsc`/`eslint`/`next build` don't catch a bad color or a contrast failure — the `--font-sans` self-reference from Phase 0 broke silently the same way, compiling cleanly while doing nothing. Start the dev server and screenshot with Playwright; don't just reason about oklch numbers on paper.

```bash
npm install --no-save --no-audit --no-fund playwright
npx playwright install chromium --with-deps   # first time only
```

Module resolution is relative to the script's own path, not `cwd` — a driver script placed outside the project (e.g. the scratchpad) won't find a `--no-save` install in `node_modules`. Drop it in the project (e.g. `prisma/_shoot.js`, gitignored-by-convention-only — delete it after) and run it from there. A throwaway route works the same way: Next's `_folder` naming makes a route **private** (unrouted) — use a plain folder name, and delete it before committing. `npm uninstall --no-save playwright` after; confirm with `git status` that neither the temp route nor the lockfile leaked into the diff.

## Inquiry (contact flow)

"Contact Buyer" / "Contact Seller" creates a single `Inquiry` record (message + timestamp), not a chat thread. Each role sees Sent / Received lists. No read state, no in-thread replies — a deliberate scope cut.

## Explicit scope cuts (do not build unless every phase in plan.md is done)

- No self-registration — 3 seed users only. **Enforced**, not just declared: `emailAndPassword.disableSignUp: true`. That also closes `auth.api.signUpEmail()`, so the seed creates users through `auth.$context.internalAdapter` (`createUser` + `linkAccount` with `providerId: "credential"`, `accountId === user.id`) — the same calls the sign-up endpoint makes once past its own guard.
- No live chat / websockets for Inquiry
- No view counters or favourites (present on the reference site, absent from the written brief)
- No currency conversion (EUR only)
- No email notifications
- No multi-language support (the approach is described in the README instead)

## Seed data

As built: 12 users (1 manager, 3 sellers, 8 buyers), 18 assets across all 3 categories / 9 countries / 10 industries with a wide price spread, 8 buyer profiles, 4 inquiries and 1 audit-log row — enough that Smart Matching shows a visible spread of scores rather than all 100% or all 0%. Users must be created via `auth.$context.internalAdapter`, never `prisma.user.create()` (pitfall 2).

Two things in the seed exist for reasons that are not obvious from reading it:

- `assertTaxonomy()` runs before **any** insert and throws if a seeded country/industry falls outside `src/lib/taxonomy.ts`. Such a row would exist but be unreachable through the filter bar, which reads as a broken filter rather than bad data.
- Every row gets an explicit, spread-out `createdAt`. Left to `now()` they all land on the same millisecond and "latest activity" ordering on `/manager` comes back arbitrary.

## Key assumptions (full reasoning belongs in the README)

1. Auth is full Better Auth + 3 seeded users, not a no-login role switcher.
2. `Asset` fields aren't specified in the brief — modeled from its "M&A opportunities and financial assets" framing, not copied 1:1 from the narrower license-trading reference site.
3. `Asset.category` (License / Operating Business / Stake) doesn't exist on the reference site — added because the written brief is broader than pure license trading.
4. Contact flow is a single `Inquiry` record, not live chat.
5. The brief requires a profile for Buyer only. Sellers get one optional `companyName` field on `User` rather than a full `SellerProfile` table.
6. `SUSPENDED` = reversible soft block, `REMOVED` = soft delete; both cascade to a Seller's assets at the application level, not via DB cascade.
7. Money is stored as `Int` in whole EUR — no floats, no `Decimal`, single currency, no conversion.
8. View counters and favourites from the reference site are intentionally excluded — not in the written brief.
9. Matching is deterministic so review runs are reproducible; the single LLM feature is additive and degrades gracefully to plain search.
