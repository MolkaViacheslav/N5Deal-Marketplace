import type { Metadata } from "next";
import Link from "next/link";

import {
  InquiryList,
  type InquiryEmptyCopy,
} from "@/components/inquiry/inquiry-list";
import type { InquiryCardData } from "@/components/inquiry/inquiry-card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { previewMessage } from "@/lib/inquiry-message";

export const metadata: Metadata = { title: "Inquiries" };

export const dynamic = "force-dynamic";

const TABS = ["sent", "received"] as const;
type InquiryTab = (typeof TABS)[number];

const TAB_LABEL: Record<InquiryTab, string> = {
  sent: "Sent",
  received: "Received",
};

function parseTab(raw: string | string[] | undefined): InquiryTab {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "received" ? "received" : "sent";
}

// A buyer's listing link goes to the public detail page — the one route where
// they can act on it.
const assetHref = (assetId: string) => `/buyer/assets/${assetId}`;

const EMPTY_COPY: InquiryEmptyCopy = {
  sentDescription:
    "Open a listing you're interested in and message the seller directly.",
  sentAction: { href: "/buyer/assets", label: "Browse listings" },
  receivedDescription:
    "When a seller reaches out about your profile, their message lands here.",
};

// Both directions share a shape, so both lists render through one component.
const INQUIRY_SELECT = {
  id: true,
  message: true,
  createdAt: true,
  asset: { select: { id: true, title: true } },
} as const;

// `email` is the whole point of the flow: an Inquiry is a one-shot message, not
// a thread (CLAUDE.md → Inquiry), so the only way for the recipient to answer
// is the address shown next to it. Without it a received message is a dead end,
// and the contact dialog's promise that "they'll see your name and email" is
// not kept.
const COUNTERPARTY_SELECT = {
  select: { name: true, email: true, companyName: true },
} as const;

export default async function BuyerInquiriesPage({
  searchParams,
}: PageProps<"/buyer/inquiries">) {
  const user = await requireRole("BUYER");
  const activeTab = parseTab((await searchParams).tab);

  // Both are fetched regardless of the active tab so the counts on the
  // inactive tab are real. Two indexed reads of a handful of rows each — far
  // cheaper than the alternative of a count query per tab on top of the list.
  const [sent, received] = await Promise.all([
    prisma.inquiry.findMany({
      where: { fromUserId: user.id },
      orderBy: { createdAt: "desc" },
      select: { ...INQUIRY_SELECT, to: COUNTERPARTY_SELECT },
    }),
    prisma.inquiry.findMany({
      where: { toUserId: user.id },
      orderBy: { createdAt: "desc" },
      select: { ...INQUIRY_SELECT, from: COUNTERPARTY_SELECT },
    }),
  ]);

  // Truncated here rather than in the card, so the untruncated message never
  // crosses the RSC boundary for a row that only ever shows a preview.
  const sentCards: InquiryCardData[] = sent.map(({ to, message, ...rest }) => ({
    ...rest,
    message: previewMessage(message),
    counterparty: to,
  }));
  const receivedCards: InquiryCardData[] = received.map(
    ({ from, message, ...rest }) => ({
      ...rest,
      message: previewMessage(message),
      counterparty: from,
    })
  );

  const counts: Record<InquiryTab, number> = {
    sent: sentCards.length,
    received: receivedCards.length,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Inquiries</h1>
        <p className="text-sm text-muted-foreground">
          Messages you&apos;ve sent to sellers, and approaches they&apos;ve made
          to you.
        </p>
      </div>

      {/* shadcn Tabs, but each trigger is a Link and the selected tab is read
          back out of `searchParams`. Radix keeps its selection in client state,
          which would reset the tab on every refresh and make it unlinkable —
          the same reason the browse filters live in the URL (CLAUDE.md →
          Conventions). `value` is driven by the server render, so the two can
          never disagree. */}
      <Tabs value={activeTab}>
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab} asChild>
              <Link href={`/buyer/inquiries?tab=${tab}`} scroll={false}>
                {TAB_LABEL[tab]}
                <span className="text-xs text-muted-foreground tabular-nums">
                  {counts[tab]}
                </span>
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <InquiryList
            inquiries={activeTab === "sent" ? sentCards : receivedCards}
            direction={activeTab}
            assetHref={assetHref}
            empty={EMPTY_COPY}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
