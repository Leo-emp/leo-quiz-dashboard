// ─────────────────────────────────────────────────────────────
//  GET /api/tokens/youtube
//  Returns a fresh YouTube access token for the upload Action.
//  Protected by DASHBOARD_WEBHOOK_SECRET (same secret as pipeline).
//  The GitHub Action calls this before uploading to YouTube.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getToken } from "@/lib/tokens";

export async function GET(request: Request) {
  // Verify webhook secret (same as pipeline callback)
  const secret = request.headers.get("x-webhook-secret");
  const expectedSecret = process.env.DASHBOARD_WEBHOOK_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get a fresh access token (auto-refreshes if expired)
  const token = await getToken("youtube");

  if (!token) {
    return NextResponse.json(
      { error: "YouTube not connected" },
      { status: 404 }
    );
  }

  // Return just the access token — the Action uses it for upload
  return NextResponse.json({
    access_token: token.access_token,
    expires_at: token.expires_at,
    account_name: token.account_name,
  });
}
