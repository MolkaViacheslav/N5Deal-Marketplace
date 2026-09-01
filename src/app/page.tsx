import { prisma } from "@/lib/db";

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
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 p-8 text-center dark:bg-black">
      <h1 className="text-2xl font-semibold tracking-tight">
        N5Deal Marketplace — prototype
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Database connection verified: {assetCount} active listings,{" "}
        {buyerCount} buyers, {sellerCount} sellers.
      </p>
    </div>
  );
}
