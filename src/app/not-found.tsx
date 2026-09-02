import type { Metadata } from "next";

import { NotFoundState } from "@/components/layout/not-found-state";

export const metadata: Metadata = { title: "Not found" };

export default function RootNotFound() {
  return <NotFoundState href="/" label="Go home" />;
}
