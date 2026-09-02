import Link from "next/link";
import { Inbox, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  InquiryCard,
  type InquiryCardData,
} from "@/components/inquiry/inquiry-card";

/**
 * What an empty tab says. The headings are the same for both roles and stay
 * here; only the sentence underneath and the Sent tab's next step differ, so
 * only those are props.
 */
export type InquiryEmptyCopy = {
  sentDescription: string;
  sentAction: { href: string; label: string };
  receivedDescription: string;
};

export function InquiryList({
  inquiries,
  direction,
  assetHref,
  empty,
}: {
  inquiries: InquiryCardData[];
  direction: "sent" | "received";
  assetHref: (assetId: string) => string;
  empty: InquiryEmptyCopy;
}) {
  if (inquiries.length === 0) {
    return <EmptyInquiries direction={direction} copy={empty} />;
  }

  return (
    <ul className="space-y-4">
      {inquiries.map((inquiry) => (
        <li key={inquiry.id}>
          <InquiryCard
            inquiry={inquiry}
            direction={direction}
            assetHref={assetHref}
          />
        </li>
      ))}
    </ul>
  );
}

/**
 * Only the Sent tab gets a call to action: not having written to anyone is
 * something the user can act on directly, whereas an empty inbox is not.
 */
function EmptyInquiries({
  direction,
  copy,
}: {
  direction: "sent" | "received";
  copy: InquiryEmptyCopy;
}) {
  const isSent = direction === "sent";
  const Icon = isSent ? Send : Inbox;

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <Icon className="size-8 text-muted-foreground" aria-hidden="true" />

        <div className="space-y-1">
          <p className="font-medium">
            {isSent ? "You haven't contacted anyone yet" : "No messages yet"}
          </p>
          <p className="max-w-md text-sm text-muted-foreground">
            {isSent ? copy.sentDescription : copy.receivedDescription}
          </p>
        </div>

        {isSent && (
          <Button asChild variant="outline" size="sm" className="mt-1">
            <Link href={copy.sentAction.href}>{copy.sentAction.label}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
