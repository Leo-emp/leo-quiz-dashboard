// ─────────────────────────────────────────────────────────────
//  Root layout — wraps every page with the dark theme and sidebar.
//  The sidebar only shows on authenticated pages (not /login).
//  Uses a conditional check via the pathname.
// ─────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import "./globals.css";
import LayoutShell from "@/components/layout-shell";

// -- App metadata shown in browser tab --
export const metadata: Metadata = {
  title: "LeoQuiz Dashboard",
  description: "Manage Leo Quiz automated kids video pipeline",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {/* LayoutShell handles showing/hiding the sidebar based on route */}
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
