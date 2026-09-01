// Single Prisma Client instance for the whole app.
//
// WHY a singleton: Next.js hot-reloads modules in dev and re-executes them.
// A bare `new PrismaClient()` per reload piles up open connections until
// Postgres starts refusing them. Cache it on globalThis, which survives the
// reload; in production the module is evaluated once anyway.
//
// Server-only. Never import this from a "use client" file.

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma 7 removed the bundled Rust engine — connections go through a driver
// adapter. PrismaPg wraps the `pg` driver. This is the RUNTIME url: the
// Supabase pooler (:6543). Migrations use DIRECT_URL via prisma.config.ts.
//
// The adapter is constructed inside the `??` branch on purpose: it allocates a
// pg.Pool, and building one on every hot-reload eval just to discard it in
// favour of the cached client is pure waste.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
