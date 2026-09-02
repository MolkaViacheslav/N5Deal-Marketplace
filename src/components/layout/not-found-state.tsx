import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * The body of every `not-found.tsx` in the app — root and per-role. A Server
 * Component: unlike `ErrorState`, nothing here needs `reset()` or any other
 * client-only capability.
 */
export function NotFoundState({
  title = "Page not found",
  description = "The page you're looking for doesn't exist or may have moved.",
  href,
  label,
}: {
  title?: string;
  description?: string;
  href: string;
  label: string;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <Compass className="size-8 text-muted-foreground" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-medium">{title}</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {description}
            </p>
          </div>
          <Button asChild className="mt-1">
            <Link href={href}>{label}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
