// ─────────────────────────────────────────────────────────────
//  POST /api/auth/disconnect
//  Disconnects a platform by deleting its token from Blob.
//  Body: { platform: "youtube" }
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { deleteToken } from "@/lib/tokens";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const platform = body.platform as string;

  // Only allow known platforms
  if (!platform || !["youtube"].includes(platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  await deleteToken(platform);
  return NextResponse.json({ disconnected: platform });
}
