// ─────────────────────────────────────────────────────────────
//  GET /api/auth/youtube
//  Redirects to Google's OAuth consent screen.
//  After the user approves, Google redirects to the callback URL.
//  Uses CSRF state token stored in a cookie for security.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function GET() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/auth/youtube/callback`;

  // Generate CSRF state token
  const state = randomBytes(32).toString("hex");

  // Build Google OAuth URL with required scopes
  const params = new URLSearchParams({
    client_id: clientId || "",
    redirect_uri: redirectUri,
    response_type: "code",
    // youtube.upload = upload videos, youtube.readonly = read channel info
    scope: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
    // "offline" = get a refresh token (essential for connect-once)
    access_type: "offline",
    // "consent" = always show the consent screen (ensures we get refresh_token)
    prompt: "consent",
    state,
  });

  // Redirect to Google with CSRF state in a cookie
  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );

  // Store state in secure cookie for CSRF verification on callback
  response.cookies.set("oauth_state_youtube", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
