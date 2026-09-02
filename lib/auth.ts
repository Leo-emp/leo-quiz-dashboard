// ─────────────────────────────────────────────────────────────
//  Authentication helpers using iron-session.
//  Provides encrypted HTTP-only session cookies for admin login.
//  Single admin user — credentials stored in environment vars.
//
//  Usage:
//    const session = await getSession();
//    session.isLoggedIn = true;
//    await session.save();
// ─────────────────────────────────────────────────────────────

import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

// -- Session data shape --
// Stored encrypted in the cookie — only the server can read it
export interface SessionData {
  // Whether the user is authenticated
  isLoggedIn: boolean;
  // Admin email (for display in the UI)
  email?: string;
}

// -- Default session values (before login) --
export const defaultSession: SessionData = {
  isLoggedIn: false,
};

// -- iron-session configuration --
export const sessionOptions: SessionOptions = {
  // Encryption key — must be at least 32 characters
  password: process.env.SESSION_SECRET || "this-is-a-development-secret-that-is-at-least-32-chars",
  // Cookie name in the browser
  cookieName: "leoquiz-session",
  cookieOptions: {
    // Only send over HTTPS in production
    secure: process.env.NODE_ENV === "production",
    // Prevent JavaScript access to the cookie
    httpOnly: true,
    // CSRF protection — cookie sent on same-site navigations
    sameSite: "lax" as const,
    // Session expires after 7 days
    maxAge: 60 * 60 * 24 * 7,
  },
};

// -- Get the current session from the request cookies --
// NOTE: In Next.js 16, `cookies()` from "next/headers" is an ASYNC function
// (it returns a Promise<ReadonlyRequestCookies>). We must `await` it before
// handing the cookie store to iron-session. This differs from Next.js <15
// where `cookies()` was synchronous.
export async function getSession() {
  // # Fail-closed: reject requests if SESSION_SECRET is missing in production
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be set in production")
  }

  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  // Ensure defaults are set on first access
  if (session.isLoggedIn === undefined) {
    session.isLoggedIn = defaultSession.isLoggedIn;
  }

  return session;
}
