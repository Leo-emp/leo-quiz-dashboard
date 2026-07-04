// ─────────────────────────────────────────────────────────────
//  GET /api/auth/status
//  Returns the connection status for all platforms.
//  Used by the settings page to show which platforms are connected.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getConnectionStatus } from "@/lib/tokens";

export async function GET() {
  const status = await getConnectionStatus();
  return NextResponse.json(status);
}
