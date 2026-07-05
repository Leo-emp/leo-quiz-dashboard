// ─────────────────────────────────────────────────────────────
//  GET /api/auth/tiktok
//  Redirects to TikTok's OAuth consent screen.
//  After the user approves, TikTok redirects to the callback URL.
//  Uses CSRF state token stored in a cookie for security.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSession } from "@/lib/auth";

export async function GET() {
  // Require admin session before initiating OAuth
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/auth/tiktok/callback`;

  // Generate CSRF state token
  const state = randomBytes(32).toString("hex");

  // Build TikTok OAuth URL with required scopes
  const params = new URLSearchParams({
    client_key: clientKey || "",
    redirect_uri: redirectUri,
    response_type: "code",
    // video.publish + video.upload for posting, user.info.basic for account name
    scope: "user.info.basic,video.publish,video.upload",
    state,
  });

  // Redirect to TikTok with CSRF state in a cookie
  const response = NextResponse.redirect(
    `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`
  );

  // Store state in secure cookie for CSRF verification on callback
  response.cookies.set("oauth_state_tiktok", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
