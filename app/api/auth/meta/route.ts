// ─────────────────────────────────────────────────────────────
//  GET /api/auth/meta
//  Redirects to Meta's OAuth consent screen.
//  A single Meta app covers both Instagram Graph API and
//  Facebook Graph API — one auth flow for both platforms.
//  After approval, Meta redirects to the callback URL.
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

  const appId = process.env.META_APP_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/auth/meta/callback`;

  // Generate CSRF state token
  const state = randomBytes(32).toString("hex");

  // Build Meta OAuth URL with scopes for both Instagram and Facebook
  const scopes = [
    "instagram_basic",
    "instagram_content_publish",
    "pages_manage_posts",
    "pages_read_engagement",
    "pages_show_list",
  ].join(",");

  const params = new URLSearchParams({
    client_id: appId || "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    state,
  });

  // Redirect to Meta with CSRF state in a cookie
  const response = NextResponse.redirect(
    `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`
  );

  // Store state in secure cookie for CSRF verification on callback
  response.cookies.set("oauth_state_meta", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
