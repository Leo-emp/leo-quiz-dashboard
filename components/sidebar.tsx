"use client";

// ─────────────────────────────────────────────────────────────
//  Sidebar navigation — fixed left panel with glassmorphism.
//  Shows Leo mascot icon at top, nav links with active state,
//  and logout button at bottom.
//  Collapses to bottom nav on mobile (< md breakpoint).
// ─────────────────────────────────────────────────────────────

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  CheckSquare,
  History,
  Settings,
  LogOut,
  Clapperboard,
} from "lucide-react";

// -- Navigation items with their routes and icons --
const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/generate", label: "Generate", icon: Sparkles },
  { href: "/queue", label: "Queue", icon: CheckSquare },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  // Get the current route to highlight the active nav item
  const pathname = usePathname();
  const router = useRouter();

  // -- Handle logout --
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <>
      {/* -- Desktop sidebar (hidden on mobile) -- */}
      <aside className="hidden md:flex glass-sidebar fixed left-0 top-0 h-screen w-64 flex-col z-50">
        {/* -- Logo / Brand area -- */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/5">
          {/* Leo mascot icon placeholder — uses Clapperboard icon */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Clapperboard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">LeoQuiz</h1>
            <p className="text-xs text-gray-400">Video Dashboard</p>
          </div>
        </div>

        {/* -- Navigation links -- */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            // Check if this nav item is the current active route
            const isActive = pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                  transition-all duration-200
                  ${isActive
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* -- Logout button at bottom -- */}
        <div className="px-3 py-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm
                       text-gray-400 hover:text-rose-400 hover:bg-rose-500/10
                       transition-all duration-200 w-full"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* -- Mobile bottom nav (hidden on desktop) -- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50
                      glass-sidebar border-t border-white/5
                      flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs
                transition-colors
                ${isActive ? "text-indigo-400" : "text-gray-500"}
              `}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
