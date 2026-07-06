// ─────────────────────────────────────────────────────────────
//  GET /api/tokens/[platform]
//  Returns a fresh access token for any platform.
//  Protected by DASHBOARD_WEBHOOK_SECRET (same secret as pipeline).
//  The GitHub Action calls this before uploading to a platform.
//  Supports: youtube, tiktok, instagram, facebook
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getToken } from "@/lib/tokens";

// -- Allowed platforms --
const VALID_PLATFORMS = ["youtube", "tiktok", "instagram", "facebook"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  // Verify webhook secret (same as pipeline callback)
  const secret = request.headers.get("x-webhook-secret");
  const expectedSecret = process.env.DASHBOARD_WEBHOOK_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { platform } = await params;

  // Validate platform name
  if (!VALID_PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: `Invalid platform: ${platform}` }, { status: 400 });
  }

  // Get a fresh access token (auto-refreshes if expired)
  const token = await getToken(platform);

  if (!token) {
    return NextResponse.json(
      { error: `${platform} not connected` },
      { status: 404 }
    );
  }

  // Return the access token + any extra fields the workflow needs
  const response: Record<string, unknown> = {
    access_token: token.access_token,
    expires_at: token.expires_at,
    account_name: token.account_name,
  };

  // Include platform-specific extra fields
  const tokenAny = token as unknown as Record<string, unknown>;
  if (tokenAny.ig_user_id) response.ig_user_id = tokenAny.ig_user_id;
  if (tokenAny.page_id) response.page_id = tokenAny.page_id;
  if (tokenAny.page_access_token) response.page_access_token = tokenAny.page_access_token;

  return NextResponse.json(response);
}
