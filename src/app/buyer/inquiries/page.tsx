import type { Metadata } from "next";
import Link from "next/link";

import { InquiryList } from "@/components/buyer/inquiry-list";
import type { InquiryCardData } from "@/components/buyer/inquiry-card";
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

// Enough to tell two messages apart in a list without turning each row into a
// wall of text; the full message is on the thread it belongs to.
const PREVIEW_LENGTH = 100;

const preview = (message: string) =>
  message.length <= PREVIEW_LENGTH
    ? message
    : `${message.slice(0, PREVIEW_LENGTH).trimEnd()}…`;

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
    message: preview(message),
    counterparty: to,
  }));
  const receivedCards: InquiryCardData[] = received.map(
    ({ from, message, ...rest }) => ({
      ...rest,
      message: preview(message),
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
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
