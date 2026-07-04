"use client";

// ─────────────────────────────────────────────────────────────
//  Layout shell — conditionally renders the sidebar.
//  On /login: full-screen content, no sidebar.
//  On all other pages: sidebar + content area with left padding.
// ─────────────────────────────────────────────────────────────

import { usePathname } from "next/navigation";
import Sidebar from "@/components/sidebar";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Don't show sidebar on the login page
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — fixed left panel */}
      <Sidebar />
      {/* Main content area — offset by sidebar width on desktop */}
      <main className="flex-1 md:ml-64 p-6 pb-24 md:pb-6">
        {children}
      </main>
    </div>
  );
}
