// ─────────────────────────────────────────────────────────────
//  GET /api/auth/status
//  Returns the connection status for all platforms.
//  Used by the settings page to show which platforms are connected.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getConnectionStatus } from "@/lib/tokens";
import { getSession } from "@/lib/auth";

export async function GET() {
  // Require admin session
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await getConnectionStatus();
  return NextResponse.json(status);
}
