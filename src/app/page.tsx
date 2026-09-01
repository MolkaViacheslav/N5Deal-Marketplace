import { prisma } from "@/lib/db";

// Prisma queries are invisible to Next's dynamic-detection (only `fetch`,
// `headers()`, `cookies()` and friends mark a route dynamic), so without this
// the page is prerendered at build time: the counts freeze at whatever the DB
// held during `next build`, and the build itself starts depending on Supabase
// being reachable.
export const dynamic = "force-dynamic";

// Phase 0 walking skeleton: proves the deployed app can reach Postgres.
// Replaced by the real landing page in Phase 9 once role routing (Phase 2)
// and the theme pass exist to link to.
export default async function Home() {
  const [assetCount, buyerCount, sellerCount] = await Promise.all([
    prisma.asset.count({ where: { listingStatus: "ACTIVE" } }),
    prisma.user.count({ where: { role: "BUYER", status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "SELLER", status: "ACTIVE" } }),
  ]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        N5Deal Marketplace — prototype
      </h1>
      <p className="text-muted-foreground">
        Database connection verified: {assetCount} active listings,{" "}
        {buyerCount} buyers, {sellerCount} sellers.
      </p>
    </div>
  );
}
