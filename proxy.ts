// ─────────────────────────────────────────────────────────────
//  Next.js Proxy (formerly "Middleware") — protects all routes
//  except public ones. Checks for a valid iron-session cookie on
//  every request. Redirects unauthenticated users to /login.
//
//  Public routes (no auth required):
//    /login — the login page itself
//    /api/auth/login — the login API endpoint
//    /api/auth/session — session-status check (must work while logged OUT
//      too, so the frontend can tell "not authenticated" from a real error;
//      the route itself only ever returns { authenticated: true/false })
//    /api/auth/logout — clearing a session must always succeed, even if
//      the session already expired/was never set
//    /api/webhook/* — pipeline callback (uses webhook secret)
//    /api/cron/* — Vercel cron jobs (uses CRON_SECRET)
//    /api/tokens/* — GitHub Action token requests (uses webhook secret)
//
//  NOTE ON NEXT.JS 16: The original SDD task brief for this project asked
//  for a `middleware.ts` file (correct for Next.js <=15). This project was
//  scaffolded with Next.js 16.2.10, which renamed the "middleware" file
//  convention to "proxy" — the behavior is identical, only the file name
//  and exported function name changed. We confirmed empirically with
//  `next build` that a `middleware.ts` file still works in 16.2.10 (it's
//  aliased for backwards compatibility) but prints:
//    "⚠ The "middleware" file convention is deprecated. Please use "proxy" instead."
//  Per AGENTS.md ("heed deprecation notices"), we use the current
//  `proxy.ts` convention instead of the deprecated alias. See:
//  node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/auth";

// Next.js looks for either a default export or a named `proxy` export.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // -- Skip auth for public routes --
  const publicPaths = [
    "/login",
    "/api/auth/login",
    "/api/auth/session", // must be reachable while logged out (returns {authenticated:false})
    "/api/auth/logout", // logging out should always succeed, even with no active session
    "/api/webhook",
    "/api/cron",
    "/api/tokens",
  ];

  // Check if the current path starts with any public path
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // -- Check session cookie --
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(
    request,
    response,
    sessionOptions
  );

  // Redirect to login if not authenticated
  if (!session.isLoggedIn) {
    // API routes return 401 instead of redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Page routes redirect to login
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

// -- Configure which routes the proxy runs on --
export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
