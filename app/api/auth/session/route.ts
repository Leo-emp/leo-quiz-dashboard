// ─────────────────────────────────────────────────────────────
//  GET /api/auth/session
//  Returns the current authentication status.
//  Used by the frontend to check if the user is logged in.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();

  if (session.isLoggedIn) {
    return NextResponse.json({
      authenticated: true,
      email: session.email,
    });
  }

  return NextResponse.json({ authenticated: false });
}
