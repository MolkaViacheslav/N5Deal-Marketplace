import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * The body of every `error.tsx` boundary in the app — root and per-role.
 *
 * A plain function component, not itself `"use client"`: it has no hooks of
 * its own, `onRetry` is just a prop. Each `error.tsx` that renders it is the
 * one that has to carry the `"use client"` directive, because Next requires
 * that on the boundary file itself.
 */
export function ErrorState({
  title = "Something went wrong",
  description = "An unexpected error occurred. You can try again, or come back in a moment.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <AlertTriangle
            className="size-8 text-destructive"
            aria-hidden="true"
          />
          <div className="space-y-1">
            <p className="font-medium">{title}</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {description}
            </p>
          </div>
          <Button onClick={onRetry} className="mt-1">
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
