import Link from "next/link";
import { Inbox, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  SellerInquiryCard,
  type SellerInquiryCardData,
} from "@/components/seller/inquiry-card";

export function SellerInquiryList({
  inquiries,
  direction,
}: {
  inquiries: SellerInquiryCardData[];
  direction: "sent" | "received";
}) {
  if (inquiries.length === 0) {
    return <EmptyInquiries direction={direction} />;
  }

  return (
    <ul className="space-y-4">
      {inquiries.map((inquiry) => (
        <li key={inquiry.id}>
          <SellerInquiryCard inquiry={inquiry} direction={direction} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Only the Sent tab gets a call to action: "browse buyers" is the actual next
 * step when you haven't written to anyone, whereas an empty inbox is not
 * something the seller can act on directly — the nearest thing is publishing
 * more, which is a different screen's job to suggest.
 */
function EmptyInquiries({ direction }: { direction: "sent" | "received" }) {
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
            {isSent
              ? "Find a buyer whose mandate fits what you're selling and message them directly."
              : "When a buyer asks about one of your listings, their message lands here."}
          </p>
        </div>

        {isSent && (
          <Button asChild variant="outline" size="sm" className="mt-1">
            <Link href="/seller/buyers">Browse buyers</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
