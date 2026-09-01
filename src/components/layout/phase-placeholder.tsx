import { Construction } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

/**
 * Temporary stand-in for a route that the shell already links to but a later
 * phase still has to build.
 *
 * It exists so Phase 2 is actually verifiable end to end: without it, every nav
 * link and every post-sign-in redirect lands on a 404, and there is no way to
 * tell a broken guard apart from a missing page. Each later phase deletes the
 * corresponding file and writes the real screen.
 */
export function PhasePlaceholder({
  title,
  phase,
  description,
}: {
  title: string;
  phase: string;
  description: string;
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <Card>
        <CardContent className="flex items-start gap-4 py-8">
          <Construction
            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div className="space-y-1">
            <p className="text-sm font-medium">Not built yet — {phase}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
