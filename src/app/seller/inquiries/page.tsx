import type { Metadata } from "next";
import Link from "next/link";

import { SellerInquiryList } from "@/components/seller/inquiry-list";
import type { SellerInquiryCardData } from "@/components/seller/inquiry-card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Inquiries" };

export const dynamic = "force-dynamic";

const TABS = ["received", "sent"] as const;
type InquiryTab = (typeof TABS)[number];

const TAB_LABEL: Record<InquiryTab, string> = {
  received: "Received",
  sent: "Sent",
};

/**
 * Received is the seller's default, where the buyer's is Sent.
 *
 * Not an inconsistency: a buyer arrives here having just written to someone, a
 * seller arrives to see who has asked about their listings. The tab a role opens
 * on should be the one they came for.
 */
function parseTab(raw: string | string[] | undefined): InquiryTab {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "sent" ? "sent" : "received";
}

// Enough to tell two messages apart in a list without turning each row into a
// wall of text.
const PREVIEW_LENGTH = 100;

// Cut by code point, not by `slice()`. A JS string indexes UTF-16 code units,
// so slicing at a fixed offset can land in the middle of a surrogate pair and
// leave a lone half behind — an emoji in a buyer's message turns the end of the
// preview into "�". `Array.from` iterates code points, so the cut always falls
// between whole characters.
const preview = (message: string) => {
  const chars = Array.from(message);
  return chars.length <= PREVIEW_LENGTH
    ? message
    : `${chars.slice(0, PREVIEW_LENGTH).join("").trimEnd()}…`;
};

// Both directions share a shape, so both lists render through one component.
const INQUIRY_SELECT = {
  id: true,
  message: true,
  createdAt: true,
  asset: { select: { id: true, title: true } },
} as const;

// `email` is the whole point of the flow: an Inquiry is a one-shot message, not
// a thread (CLAUDE.md → Inquiry), so the only way to answer is the address shown
// next to it.
const COUNTERPARTY_SELECT = {
  select: { name: true, email: true, companyName: true },
} as const;

export default async function SellerInquiriesPage({
  searchParams,
}: PageProps<"/seller/inquiries">) {
  const user = await requireRole("SELLER");
  const activeTab = parseTab((await searchParams).tab);

  // Both are fetched regardless of the active tab so the count on the inactive
  // tab is real. Two indexed reads of a handful of rows each — cheaper than a
  // count query per tab on top of the list.
  const [received, sent] = await Promise.all([
    prisma.inquiry.findMany({
      where: { toUserId: user.id },
      orderBy: { createdAt: "desc" },
      select: { ...INQUIRY_SELECT, from: COUNTERPARTY_SELECT },
    }),
    prisma.inquiry.findMany({
      where: { fromUserId: user.id },
      orderBy: { createdAt: "desc" },
      select: { ...INQUIRY_SELECT, to: COUNTERPARTY_SELECT },
    }),
  ]);

  // Truncated here rather than in the card, so the untruncated message never
  // crosses the RSC boundary for a row that only ever shows a preview.
  const receivedCards: SellerInquiryCardData[] = received.map(
    ({ from, message, ...rest }) => ({
      ...rest,
      message: preview(message),
      counterparty: from,
    })
  );
  const sentCards: SellerInquiryCardData[] = sent.map(
    ({ to, message, ...rest }) => ({
      ...rest,
      message: preview(message),
      counterparty: to,
    })
  );

  const counts: Record<InquiryTab, number> = {
    received: receivedCards.length,
    sent: sentCards.length,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Inquiries</h1>
        <p className="text-sm text-muted-foreground">
          Buyers asking about your listings, and the approaches you&apos;ve made
          to them.
        </p>
      </div>

      {/* shadcn Tabs, but each trigger is a Link and the selected tab is read
          back out of `searchParams`. Radix keeps its selection in client state,
          which would reset the tab on every refresh and make it unlinkable — the
          same reason list filters live in the URL (CLAUDE.md → Conventions).
          `value` is driven by the server render, so the two cannot disagree. */}
      <Tabs value={activeTab}>
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab} asChild>
              <Link href={`/seller/inquiries?tab=${tab}`} scroll={false}>
                {TAB_LABEL[tab]}
                <span className="text-xs text-muted-foreground tabular-nums">
                  {counts[tab]}
                </span>
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <SellerInquiryList
            inquiries={activeTab === "sent" ? sentCards : receivedCards}
            direction={activeTab}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
