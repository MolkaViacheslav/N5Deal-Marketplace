import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "N5Deal — M&A and financial asset marketplace",
    template: "%s · N5Deal",
  },
  description:
    "Marketplace for M&A opportunities and financial assets: licences, operating businesses and equity stakes across the EEA.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/* Mounted once, at the root: `toast()` is called from client
            components all over the app (contact dialog, profile form, the
            Phase 5–6 mutations) and does nothing at all unless this renderer
            is somewhere in the tree. Cheap enough to keep out of every
            individual layout.

            Bottom-right rather than top-right: the app shell's header is
            sticky, and a top-right toast lands squarely on the account name,
            role badge and sign-out button. */}
        <Toaster />
      </body>
    </html>
  );
}
