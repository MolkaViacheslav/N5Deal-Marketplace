import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 split the two concerns that used to share the `datasource` block:
//
//   • Runtime  → the driver adapter in src/lib/db.ts, which takes DATABASE_URL
//                (Supabase pooler, :6543, ?pgbouncer=true&connection_limit=1).
//   • CLI      → this file. Migrations must NOT go through pgbouncer — they
//                need session-level connections, so we point the CLI at
//                DIRECT_URL (:5432) and only fall back to DATABASE_URL for
//                local Postgres, where a single URL is all there is.
//
// This replaces the old `directUrl` field in schema.prisma.

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
