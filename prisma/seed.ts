// Demo data. Run with `npm run db:seed`.
//
// Idempotent by truncation: it wipes the domain and auth tables, then rebuilds
// everything. Safe to re-run; never run it against anything but a demo DB.
//
// The one non-obvious rule: users must NOT be created with
// `prisma.user.create()`. Better Auth keeps its own scrypt hash in
// Account.password, so a hand-inserted user row exists but can never sign in.
//
// Sign-up is closed (`disableSignUp: true` — see src/lib/auth.ts), which also
// closes `auth.api.signUpEmail()`. So the seed drops to the layer directly
// underneath it: `auth.$context.internalAdapter`, which is what the sign-up
// endpoint itself calls once it is past the disableSignUp check. Same hashing,
// same ID generation, same field mapping — just without the public endpoint.

import "dotenv/config";

import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/db";
import { COUNTRIES, INDUSTRIES } from "../src/lib/taxonomy";
import type { Prisma } from "../src/generated/prisma/client";

// The filter bar offers exactly COUNTRIES and INDUSTRIES. A seeded value
// outside those lists is invisible to every filter — the listing exists but
// can never be found, which looks like a broken filter rather than bad data.
// Fail loudly here instead.
// Prisma types a scalar-list on createMany as `string[] | { set: string[] }`.
const listOf = (v: string[] | { set: string[] } | undefined): string[] =>
  v === undefined ? [] : Array.isArray(v) ? v : v.set;

function assertTaxonomy(
  rows: Prisma.AssetCreateManyInput[],
  profileRows: Prisma.BuyerProfileCreateManyInput[]
) {
  const countries = new Set<string>(COUNTRIES);
  const industries = new Set<string>(INDUSTRIES);
  const problems: string[] = [];

  for (const row of rows) {
    if (!countries.has(row.country))
      problems.push(`asset "${row.title}": country "${row.country}"`);
    if (!industries.has(row.industry))
      problems.push(`asset "${row.title}": industry "${row.industry}"`);
  }
  for (const [i, p] of profileRows.entries()) {
    for (const r of listOf(p.regions))
      if (!countries.has(r)) problems.push(`profile ${i}: region "${r}"`);
    for (const ind of listOf(p.industries))
      if (!industries.has(ind)) problems.push(`profile ${i}: industry "${ind}"`);
  }

  if (problems.length) {
    throw new Error(
      `Seed data is outside src/lib/taxonomy.ts:\n  ${problems.join("\n  ")}`
    );
  }
}

const DEMO_PASSWORD = "demo1234";

// Without explicit timestamps every seeded row lands on the same millisecond,
// so "latest activity" lists (/manager, the inquiry tabs) come back in
// arbitrary order and look broken. Spread them over the last week instead.
const SEEDED_AT = Date.now();
const hoursAgo = (h: number) => new Date(SEEDED_AT - h * 60 * 60 * 1000);
const daysAgo = (d: number) => hoursAgo(d * 24);

type SeedRole = "BUYER" | "SELLER" | "MANAGER";

// `auth.$context` is a promise. Resolve it (and hash the shared demo password)
// once, lazily — every seeded user gets the same password, so hashing it 12
// times would just be 12x the scrypt cost for an identical result.
type AuthContext = Awaited<typeof auth.$context>;

let authSetup: Promise<{ ctx: AuthContext; passwordHash: string }> | null = null;

function getAuthSetup() {
  authSetup ??= (async () => {
    const ctx = await auth.$context;
    return { ctx, passwordHash: await ctx.password.hash(DEMO_PASSWORD) };
  })();
  return authSetup;
}

async function createUser(opts: {
  email: string;
  name: string;
  role: SeedRole;
  companyName?: string;
}) {
  const { ctx, passwordHash } = await getAuthSetup();

  const user = await ctx.internalAdapter.createUser({
    email: opts.email,
    name: opts.name,
    emailVerified: true,
    role: opts.role,
    status: "ACTIVE",
    companyName: opts.companyName ?? null,
  });

  // providerId "credential" + accountId === user.id is exactly what
  // sign-up/email writes for an email+password account.
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: passwordHash,
  });

  return user;
}

async function wipe() {
  // Order matters: children before parents.
  await prisma.auditLog.deleteMany();
  await prisma.inquiry.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.buyerProfile.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  console.log("Wiping existing data...");
  await wipe();

  // ---------------------------------------------------------------- users
  console.log("Creating users...");

  const manager = await createUser({
    email: "manager@demo.com",
    name: "Nora Whelan",
    role: "MANAGER",
  });

  // seller@demo.com is the login the README hands the reviewer, so it owns the
  // most interesting spread of listings.
  const sellerDemo = await createUser({
    email: "seller@demo.com",
    name: "Diarmuid Kelly",
    role: "SELLER",
    companyName: "Kelly Corporate Advisory",
  });
  const sellerLisbon = await createUser({
    email: "seller.lisbon@demo.com",
    name: "Inês Carvalho",
    role: "SELLER",
    companyName: "Atlântico Partners",
  });
  const sellerTallinn = await createUser({
    email: "seller.tallinn@demo.com",
    name: "Mart Sepp",
    role: "SELLER",
    companyName: "Baltic Exit Group",
  });

  const buyerDemo = await createUser({
    email: "buyer@demo.com",
    name: "Aoife Brennan",
    role: "BUYER",
  });

  const otherBuyers = await Promise.all(
    [
      { email: "buyer.hansen@demo.com", name: "Lars Hansen" },
      { email: "buyer.moreau@demo.com", name: "Camille Moreau" },
      { email: "buyer.rossi@demo.com", name: "Giulia Rossi" },
      { email: "buyer.novak@demo.com", name: "Petr Novák" },
      { email: "buyer.okafor@demo.com", name: "Chidi Okafor" },
      { email: "buyer.silva@demo.com", name: "Tomás Silva" },
      { email: "buyer.zielinska@demo.com", name: "Marta Zielińska" },
    ].map((u) => createUser({ ...u, role: "BUYER" }))
  );

  // -------------------------------------------------------- buyer profiles
  // Spread deliberately: some profiles hit all three matching criteria on some
  // assets, some hit one, some hit none. A demo where every score is 100% or
  // 0% tells a reviewer nothing about the matching logic.
  console.log("Building buyer profiles...");

  const profiles: Prisma.BuyerProfileCreateManyInput[] = [
    {
      userId: buyerDemo.id,
      industries: ["Fintech", "Payments", "Crypto & Digital Assets"],
      regions: ["Ireland", "Portugal", "Estonia"],
      budgetMin: 200_000,
      budgetMax: 3_000_000,
      description:
        "Looking for regulated payment and e-money businesses in the EEA. Prefer entities with a live licence and a clean regulatory history; open to dormant licences if the transfer path is clear.",
    },
    {
      userId: otherBuyers[0].id, // Hansen
      industries: ["Renewable Energy", "Logistics"],
      regions: ["Germany", "Netherlands", "Poland"],
      budgetMin: 2_000_000,
      budgetMax: 15_000_000,
      description:
        "Family office building an infrastructure portfolio. Majority stakes only, EBITDA-positive, no early-stage.",
    },
    {
      userId: otherBuyers[1].id, // Moreau
      industries: ["Insurance", "Wealth Management"],
      regions: ["Malta", "Cyprus", "Ireland"],
      budgetMin: 500_000,
      budgetMax: 4_000_000,
      description:
        "Acquiring insurance intermediaries and small AIFMs to consolidate under an existing Maltese platform.",
    },
    {
      userId: otherBuyers[2].id, // Rossi
      industries: ["SaaS", "Fintech"],
      regions: ["Spain", "Portugal"],
      budgetMin: 100_000,
      budgetMax: 900_000,
      description:
        "Bootstrapped operator looking for a small B2B SaaS with recurring revenue to run, not to flip.",
    },
    {
      userId: otherBuyers[3].id, // Novák
      industries: ["iGaming", "Crypto & Digital Assets"],
      regions: ["Malta", "Cyprus", "Estonia"],
      budgetMin: 300_000,
      // No upper bound — tests the open-ended budget branch in matching.
      budgetMax: null,
      description:
        "Gaming group expanding licence coverage across EU jurisdictions.",
    },
    {
      userId: otherBuyers[4].id, // Okafor
      industries: ["Lending", "Payments"],
      regions: ["Lithuania", "Estonia", "Poland"],
      budgetMin: 250_000,
      budgetMax: 2_000_000,
      description:
        "Consumer lending platform seeking an EMI or PI licence in the Baltics to bring payments in-house.",
    },
    // No profile for otherBuyers[5] (Silva) — deliberately, do not "fix" this
    // by adding one. Smart Matching has two fallbacks for a buyer who has said
    // nothing about themselves: the "Complete your profile" prompt on
    // /buyer/assets, and the no-badge / sorted-last treatment on /seller/buyers.
    // With a profile on every seeded buyer, neither is reachable and a reviewer
    // reading about them in the README has no way to see them. Silva is the one
    // dropped because their mandate was the least load-bearing of the eight —
    // Zielińska's below is the only profile with both budget bounds null, which
    // is what demonstrates that an unstated budget scores 0 rather than acting
    // as a wildcard.
    {
      userId: otherBuyers[6].id, // Zielińska
      industries: ["Logistics", "SaaS"],
      regions: ["Poland", "Germany", "Lithuania"],
      // Both bounds open — an intentionally under-specified profile, so the
      // budget component scores 0 rather than acting as a wildcard.
      budgetMin: null,
      budgetMax: null,
      description:
        "Still defining the mandate. Broadly interested in supply-chain software and 3PL operators in CEE.",
    },
  ];

  // ---------------------------------------------------------------- assets
  console.log("Building assets...");

  const assets: Prisma.AssetCreateManyInput[] = [
    // ----- LICENSE -----
    {
      sellerId: sellerDemo.id,
      title: "Irish E-Money Institution licence, fully authorised",
      category: "LICENSE",
      country: "Ireland",
      industry: "Payments",
      businessStatus: "ACTIVE",
      askingPrice: 1_850_000,
      employees: "11-25",
      yearFounded: 2019,
      description:
        "Central Bank of Ireland authorised EMI, passported into 14 EEA states. Live IBAN issuance via a tier-1 sponsor bank, SEPA Instant and card issuing in place. Clean regulatory record, no open enforcement matters. Sale includes the entity, licence, banking relationships and the compliance team if desired.",
      keyAssetsIncluded: [
        "EMI licence",
        "EEA passporting (14 states)",
        "Sponsor bank relationship",
        "Compliance framework & MLRO",
        "Core ledger integration",
      ],
      regulatoryBody: "Central Bank of Ireland",
      licenseType: "E-Money Institution (EMI)",
    },
    {
      sellerId: sellerTallinn.id,
      title: "Estonian Payment Institution licence, dormant entity",
      category: "LICENSE",
      country: "Estonia",
      industry: "Payments",
      businessStatus: "DORMANT",
      askingPrice: 420_000,
      employees: "1-5",
      yearFounded: 2021,
      description:
        "Finantsinspektsioon authorised Payment Institution. Operations wound down in 2024; the licence, entity and AML framework are maintained and in good standing. Suitable for a buyer who wants a clean shell with an existing authorisation rather than a 9-12 month application.",
      keyAssetsIncluded: [
        "PI licence",
        "Registered Estonian entity",
        "AML/KYC policy set",
        "Local management board seat",
      ],
      regulatoryBody: "Finantsinspektsioon",
      licenseType: "Payment Institution (PI)",
    },
    {
      sellerId: sellerLisbon.id,
      title: "Maltese Category 2 investment services licence",
      category: "LICENSE",
      country: "Malta",
      industry: "Wealth Management",
      businessStatus: "ACTIVE",
      askingPrice: 950_000,
      employees: "6-10",
      yearFounded: 2017,
      description:
        "MFSA Category 2 licence permitting discretionary portfolio management and reception & transmission of orders. Circa €40M AUM across 90 client relationships, majority retained under a two-year earn-out. Sale is of the licensed entity.",
      keyAssetsIncluded: [
        "MFSA Cat 2 licence",
        "€40M AUM book",
        "Custodian agreements",
        "Compliance & risk function",
      ],
      regulatoryBody: "Malta Financial Services Authority",
      licenseType: "Investment Services Category 2",
    },
    {
      sellerId: sellerTallinn.id,
      title: "Lithuanian EMI licence with live BaaS stack",
      category: "LICENSE",
      country: "Lithuania",
      industry: "Fintech",
      businessStatus: "ACTIVE",
      askingPrice: 2_400_000,
      employees: "26-50",
      yearFounded: 2018,
      description:
        "Bank of Lithuania EMI serving 30+ fintech clients on a banking-as-a-service model. €1.1B annualised payment volume, positive contribution margin. Sale includes the platform, the licence and the client contracts.",
      keyAssetsIncluded: [
        "EMI licence",
        "BaaS platform & API",
        "30+ B2B client contracts",
        "SEPA & SWIFT connectivity",
        "In-house engineering team",
      ],
      regulatoryBody: "Bank of Lithuania",
      licenseType: "E-Money Institution (EMI)",
    },
    {
      sellerId: sellerDemo.id,
      title: "Cypriot CASP registration, pre-MiCA transitional",
      category: "LICENSE",
      country: "Cyprus",
      industry: "Crypto & Digital Assets",
      businessStatus: "DORMANT",
      askingPrice: 310_000,
      employees: "1-5",
      yearFounded: 2022,
      description:
        "CySEC Crypto Asset Service Provider registration held through the MiCA transitional period. Never traded at volume. Buyer should budget for the full MiCA authorisation uplift; priced accordingly.",
      keyAssetsIncluded: [
        "CASP registration",
        "Cypriot entity",
        "AML framework",
      ],
      regulatoryBody: "Cyprus Securities and Exchange Commission",
      licenseType: "Crypto Asset Service Provider (CASP)",
    },
    {
      sellerId: sellerLisbon.id,
      title: "Maltese B2C iGaming licence, live brand",
      category: "LICENSE",
      country: "Malta",
      industry: "iGaming",
      businessStatus: "ACTIVE",
      askingPrice: 3_600_000,
      employees: "51-100",
      yearFounded: 2016,
      description:
        "MGA B2C licence with an operating casino brand: 22,000 monthly actives, €4.1M annual NGR, in-house CRM. Player database and brand transfer with the entity. Payment and game-provider contracts are assignable subject to consent.",
      keyAssetsIncluded: [
        "MGA B2C licence",
        "Operating brand & domains",
        "22k monthly active players",
        "Game provider contracts",
        "CRM and retention stack",
      ],
      regulatoryBody: "Malta Gaming Authority",
      licenseType: "B2C Gaming Service Licence",
    },

    // ----- OPERATING_BUSINESS -----
    {
      sellerId: sellerDemo.id,
      title: "Dublin B2B compliance SaaS, €780K ARR",
      category: "OPERATING_BUSINESS",
      country: "Ireland",
      industry: "SaaS",
      businessStatus: "ACTIVE",
      askingPrice: 2_900_000,
      employees: "11-25",
      yearFounded: 2018,
      description:
        "Regulatory reporting platform used by 60 credit unions and small banks. Net revenue retention 112%, gross churn under 6%, two-year average contract length. Founder-led and profitable; founder will stay 12 months post-close.",
      keyAssetsIncluded: [
        "Platform & source code",
        "60 enterprise contracts",
        "Engineering team (7)",
        "ISO 27001 certification",
      ],
      annualRevenue: 780_000,
      reasonForSale:
        "Founder relocating; the business needs a sales function he is not the right person to build.",
    },
    {
      sellerId: sellerLisbon.id,
      title: "Lisbon insurance brokerage, 4,200 policies",
      category: "OPERATING_BUSINESS",
      country: "Portugal",
      industry: "Insurance",
      businessStatus: "ACTIVE",
      askingPrice: 1_450_000,
      employees: "11-25",
      yearFounded: 2009,
      description:
        "Independent broker placing motor, home and SME commercial lines. 4,200 active policies, 91% renewal rate, commission income of €620K. Agency agreements with seven insurers, all assignable.",
      keyAssetsIncluded: [
        "Policy book (4,200)",
        "Seven agency agreements",
        "Client CRM",
        "Two office leases",
      ],
      annualRevenue: 620_000,
      reasonForSale: "Owners retiring; no succession within the family.",
    },
    {
      sellerId: sellerTallinn.id,
      title: "Baltic 3PL and last-mile operator",
      category: "OPERATING_BUSINESS",
      country: "Lithuania",
      industry: "Logistics",
      businessStatus: "ACTIVE",
      askingPrice: 6_800_000,
      employees: "101-250",
      yearFounded: 2011,
      description:
        "Warehousing and last-mile delivery across Lithuania, Latvia and Estonia. Two owned distribution centres (31,000 m² combined), 84 vehicles, contracts with three of the region's largest e-commerce platforms.",
      keyAssetsIncluded: [
        "Two distribution centres",
        "Fleet of 84 vehicles",
        "Anchor e-commerce contracts",
        "WMS and routing software",
      ],
      annualRevenue: 11_200_000,
      reasonForSale:
        "PE holder at the end of its fund life; a full exit is required by Q3.",
    },
    {
      sellerId: sellerLisbon.id,
      title: "Porto private dental group, four clinics",
      category: "OPERATING_BUSINESS",
      country: "Portugal",
      industry: "Healthcare",
      businessStatus: "ACTIVE",
      askingPrice: 4_200_000,
      employees: "26-50",
      yearFounded: 2013,
      description:
        "Four clinics across greater Porto with 19 chairs, 14,000 active patients and a stable clinician roster. Two premises are freehold and included; two are leased to 2031.",
      keyAssetsIncluded: [
        "Four operating clinics",
        "Two freehold properties",
        "14,000 patient base",
        "Clinical staff under contract",
      ],
      annualRevenue: 3_100_000,
      reasonForSale:
        "Founding dentist reducing clinical hours and stepping back from management.",
    },
    {
      sellerId: sellerDemo.id,
      title: "Madrid field-service SaaS, small but profitable",
      category: "OPERATING_BUSINESS",
      country: "Spain",
      industry: "SaaS",
      businessStatus: "ACTIVE",
      askingPrice: 640_000,
      employees: "1-5",
      yearFounded: 2020,
      description:
        "Scheduling and dispatch tool for HVAC and plumbing firms. 310 paying accounts at €58/month average, €41K MRR run-rate is on a slow upward trend with no paid acquisition. Runs on two part-time contractors.",
      keyAssetsIncluded: [
        "Product & codebase",
        "310 subscription accounts",
        "Domain and content library",
      ],
      annualRevenue: 216_000,
      reasonForSale:
        "Owner has a larger venture taking his full attention; this has been on autopilot for a year.",
    },
    {
      sellerId: sellerTallinn.id,
      title: "Warsaw consumer lending platform, licensed",
      category: "OPERATING_BUSINESS",
      country: "Poland",
      industry: "Lending",
      businessStatus: "ACTIVE",
      askingPrice: 5_100_000,
      employees: "51-100",
      yearFounded: 2015,
      description:
        "Instalment lender with an own-book portfolio of €18M gross receivables and proprietary underwriting. Cost of risk 4.1%, funded by a mix of institutional debt and retail bonds. KNF-registered.",
      keyAssetsIncluded: [
        "€18M receivables portfolio",
        "Underwriting models",
        "Funding lines",
        "Collections operation",
      ],
      annualRevenue: 7_400_000,
      reasonForSale:
        "Shareholders are consolidating into their Czech operation and exiting Poland.",
    },
    {
      sellerId: sellerLisbon.id,
      title: "Andalusian solar portfolio operator, 46 MW",
      category: "OPERATING_BUSINESS",
      country: "Spain",
      industry: "Renewable Energy",
      businessStatus: "ACTIVE",
      askingPrice: 11_500_000,
      employees: "11-25",
      yearFounded: 2014,
      description:
        "Operating company managing 46 MW of installed solar across six sites, with long-term PPAs covering 78% of output to 2034. Includes the O&M team and the SCADA platform.",
      keyAssetsIncluded: [
        "46 MW under management",
        "PPAs to 2034",
        "O&M team",
        "SCADA & monitoring platform",
      ],
      annualRevenue: 4_900_000,
      reasonForSale:
        "Sponsor rotating capital into a new development pipeline.",
    },

    // ----- STAKE -----
    {
      sellerId: sellerDemo.id,
      title: "35% stake in an Amsterdam freight-forwarding group",
      category: "STAKE",
      country: "Netherlands",
      industry: "Logistics",
      businessStatus: "ACTIVE",
      askingPrice: 3_200_000,
      employees: "101-250",
      yearFounded: 2006,
      description:
        "Minority stake in a profitable air and sea freight forwarder. Board seat included, drag and tag rights documented. The two founders retain 65% and are not selling further.",
      keyAssetsIncluded: [
        "35% equity",
        "Board seat",
        "Tag-along rights",
        "Audited accounts, 5 years",
      ],
      stakePercentage: 35,
      annualRevenue: 24_000_000,
    },
    {
      sellerId: sellerTallinn.id,
      title: "51% controlling stake in a Berlin proptech",
      category: "STAKE",
      country: "Germany",
      industry: "Real Estate",
      businessStatus: "ACTIVE",
      askingPrice: 7_600_000,
      employees: "26-50",
      yearFounded: 2019,
      description:
        "Majority stake in a residential property-management platform with 34,000 units under contract. Revenue is 90% recurring SaaS plus a transactional tenancy-services line.",
      keyAssetsIncluded: [
        "51% equity, control",
        "34,000 units under contract",
        "Platform & IP",
        "Management team retained",
      ],
      stakePercentage: 51,
      annualRevenue: 5_300_000,
    },
    {
      sellerId: sellerLisbon.id,
      title: "20% stake in an early-stage Tallinn crypto custodian",
      category: "STAKE",
      country: "Estonia",
      industry: "Crypto & Digital Assets",
      businessStatus: "ACTIVE",
      askingPrice: 480_000,
      employees: "6-10",
      yearFounded: 2023,
      description:
        "Secondary sale by an angel investor. Pre-revenue institutional custody build with MiCA authorisation in progress. Speculative; priced at the last round's valuation with no premium.",
      keyAssetsIncluded: [
        "20% equity",
        "Information rights",
        "Pro-rata rights in the next round",
      ],
      stakePercentage: 20,
      // No annualRevenue — pre-revenue. Tests the optional-revenue branch.
      annualRevenue: null,
    },
    {
      sellerId: sellerDemo.id,
      title: "40% stake in a Cork wind-maintenance contractor",
      category: "STAKE",
      country: "Ireland",
      industry: "Renewable Energy",
      businessStatus: "ACTIVE",
      askingPrice: 1_900_000,
      employees: "26-50",
      yearFounded: 2012,
      description:
        "Minority stake in a blade-and-gearbox maintenance contractor serving onshore wind across Ireland and western Scotland. Framework agreements with two utilities run to 2029.",
      keyAssetsIncluded: [
        "40% equity",
        "Framework agreements to 2029",
        "Certified rope-access crews",
        "Specialist plant",
      ],
      stakePercentage: 40,
      annualRevenue: 6_100_000,
    },
    // One listing already suspended by moderation, so the Manager screens and
    // the buyer-side filtering both have a non-ACTIVE row to prove out.
    {
      sellerId: sellerTallinn.id,
      title: "Guaranteed-return payment licence, immediate approval",
      category: "LICENSE",
      country: "Cyprus",
      industry: "Payments",
      businessStatus: "DORMANT",
      askingPrice: 45_000,
      employees: "1-5",
      yearFounded: 2024,
      description:
        "Listing suspended by a platform manager: the claims about guaranteed regulatory approval could not be substantiated and the entity details did not match the register. Retained as an audit trail.",
      keyAssetsIncluded: ["Unverified"],
      regulatoryBody: "Unspecified",
      licenseType: "Unspecified",
      listingStatus: "SUSPENDED",
    },
  ];

  // Validate BOTH collections before either is written — otherwise the guard
  // is decorative for whichever one was already inserted.
  assertTaxonomy(assets, profiles);

  console.log("Writing buyer profiles and assets...");
  await prisma.buyerProfile.createMany({ data: profiles });
  await prisma.asset.createMany({
    // Deterministic but non-monotonic spread over ~2 months, so a "newest
    // first" sort produces a genuinely mixed list rather than just reversing
    // the array literal above.
    data: assets.map((asset, i) => ({
      ...asset,
      createdAt: daysAgo(((i * 37) % 59) + 1),
    })),
  });

  // ------------------------------------------------------------- inquiries
  // A handful so the Sent/Received tabs are not empty on first load.
  console.log("Creating inquiries...");

  const irishEmi = await prisma.asset.findFirstOrThrow({
    where: { title: { startsWith: "Irish E-Money" } },
  });
  const dublinSaas = await prisma.asset.findFirstOrThrow({
    where: { title: { startsWith: "Dublin B2B" } },
  });

  await prisma.inquiry.createMany({
    data: [
      {
        fromUserId: buyerDemo.id,
        toUserId: sellerDemo.id,
        assetId: irishEmi.id,
        message:
          "Interested in the EMI. Could you share the passporting list and confirm whether the sponsor bank relationship survives a change of control? We are ready to sign an NDA today.",
        createdAt: daysAgo(6),
      },
      {
        fromUserId: otherBuyers[5].id, // Silva
        toUserId: sellerLisbon.id,
        assetId: null,
        message:
          "We are actively acquiring clinics in Portugal. If the Porto dental group does not complete, we would like to be told before it is relisted.",
        createdAt: daysAgo(4),
      },
      {
        fromUserId: otherBuyers[2].id, // Rossi
        toUserId: sellerDemo.id,
        assetId: dublinSaas.id,
        message:
          "What does the 112% net revenue retention look like excluding the two largest accounts? Also, is the founder's 12-month commitment contractual or a handshake?",
        createdAt: daysAgo(2),
      },
      // Seller-initiated: no asset attached, which is why Inquiry.assetId is
      // nullable.
      {
        fromUserId: sellerDemo.id,
        toUserId: buyerDemo.id,
        assetId: null,
        message:
          "Saw your profile — payments and e-money in Ireland and Portugal. I have two mandates that have not been listed yet. Worth a call?",
        createdAt: hoursAgo(5),
      },
    ],
  });

  // ------------------------------------------------------------- audit log
  // The suspended listing above needs the record that explains it.
  const suspendedAsset = await prisma.asset.findFirstOrThrow({
    where: { listingStatus: "SUSPENDED" },
  });

  await prisma.auditLog.create({
    data: {
      actorId: manager.id,
      action: "SUSPEND_ASSET",
      targetType: "ASSET",
      targetId: suspendedAsset.id,
      reason:
        "Unsubstantiated claim of guaranteed regulatory approval; entity details do not match the public register.",
      createdAt: daysAgo(3),
    },
  });

  const counts = {
    users: await prisma.user.count(),
    buyerProfiles: await prisma.buyerProfile.count(),
    assets: await prisma.asset.count(),
    inquiries: await prisma.inquiry.count(),
    auditLogs: await prisma.auditLog.count(),
  };

  console.log("Seed complete:", counts);
  console.log(`\nDemo logins (password: ${DEMO_PASSWORD})`);
  console.log("  buyer@demo.com    BUYER");
  console.log("  seller@demo.com   SELLER");
  console.log("  manager@demo.com  MANAGER");
  // The one seeded buyer without a profile. Signing in as them is the only way
  // to see the no-profile half of Smart Matching, and nothing on the sign-in
  // page hints at it — the quick-login buttons cover the three above only.
  console.log(
    "\n  buyer.silva@demo.com has no BuyerProfile — sign in as them for the\n  'complete your profile' fallback on /buyer/assets."
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
