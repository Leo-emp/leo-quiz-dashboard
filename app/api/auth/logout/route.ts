// ─────────────────────────────────────────────────────────────
//  POST /api/auth/logout
//  Destroys the session cookie, logging the admin out.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function POST() {
  // Destroy the session — clears the encrypted cookie
  const session = await getSession();
  session.destroy();

  return NextResponse.json({ success: true });
}
