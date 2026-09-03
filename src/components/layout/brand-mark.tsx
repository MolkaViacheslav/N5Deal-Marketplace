/**
 * The "N5" half of the wordmark, in a small two-tone gradient — the same
 * indigo `--primary` hue drifting into violet, rather than flat text. Used by
 * `AppShell`'s header and the signed-out `/sign-in` page; kept as one
 * component so the two can't drift into two different gradients.
 */
export function BrandMark() {
  return (
    <span className="bg-gradient-to-br from-[oklch(0.47_0.19_258)] to-[oklch(0.55_0.18_300)] bg-clip-text text-transparent dark:from-[oklch(0.64_0.19_258)] dark:to-[oklch(0.7_0.18_300)]">
      N5
    </span>
  );
}
