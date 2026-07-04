// ─────────────────────────────────────────────────────────────
//  Root layout — the outermost wrapper for every page in the
//  App Router. Kept minimal for Task 1: it just mounts the
//  global stylesheet (Tailwind) and sets basic page metadata.
//  Later tasks will add fonts, nav, and auth-aware chrome here.
// ─────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import "./globals.css";

// -- Page metadata shown in the browser tab / search results --
export const metadata: Metadata = {
  title: "LeoQuiz Dashboard",
  description: "Admin dashboard for the LeoQuiz video pipeline",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* body just renders whatever page/layout is active */}
      <body>{children}</body>
    </html>
  );
}
