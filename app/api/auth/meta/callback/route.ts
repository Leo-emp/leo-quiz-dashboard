// ─────────────────────────────────────────────────────────────
//  GET /api/auth/meta/callback
//  Meta redirects here after the user approves.
//  Exchanges the auth code for a long-lived token,
//  fetches Instagram user ID + Facebook Page info,
//  saves tokens to Blob for both platforms,
//  and redirects to /settings.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { saveToken } from "@/lib/tokens";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Require admin session before completing OAuth
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.redirect(`${appUrl}/login`);
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");

  // Handle denial or error from Meta
  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/settings?error=meta_denied`);
  }

  // Verify CSRF state token
  const cookieStore = await cookies();
  const savedState = cookieStore.get("oauth_state_meta")?.value;
  if (!state || !savedState || state !== savedState) {
    return NextResponse.redirect(`${appUrl}/settings?error=meta_csrf`);
  }

  try {
    const appId = process.env.META_APP_ID || "";
    const appSecret = process.env.META_APP_SECRET || "";
    const redirectUri = `${appUrl}/api/auth/meta/callback`;

    // Step 1: Exchange auth code for short-lived token
    const tokenParams = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    });

    const tokenResponse = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?${tokenParams.toString()}`
    );

    if (!tokenResponse.ok) {
      return NextResponse.redirect(`${appUrl}/settings?error=meta_token_failed`);
    }

    const shortLivedTokens = await tokenResponse.json();

    // Step 2: Exchange for long-lived token (~60 days)
    const longLivedParams = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortLivedTokens.access_token,
    });

    const longLivedResponse = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?${longLivedParams.toString()}`
    );

    const longLivedTokens = longLivedResponse.ok
      ? await longLivedResponse.json()
      : shortLivedTokens;

    const accessToken = longLivedTokens.access_token || shortLivedTokens.access_token;
    const expiresIn = longLivedTokens.expires_in || 5184000; // ~60 days

    // Step 3: Get Instagram Business Account ID
    let igUserId = "";
    let igAccountName = "Instagram Account";
    try {
      const igResponse = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?fields=instagram_business_account,name&access_token=${accessToken}`
      );
      if (igResponse.ok) {
        const igData = await igResponse.json();
        const page = igData.data?.[0];
        if (page?.instagram_business_account?.id) {
          igUserId = page.instagram_business_account.id;
          igAccountName = page.name || igAccountName;
        }
      }
    } catch {
      // Instagram might not be connected — not critical
    }

    // Step 4: Get Facebook Page info
    let pageId = "";
    let pageAccessToken = accessToken;
    let fbAccountName = "Facebook Page";
    try {
      const pagesResponse = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${accessToken}`
      );
      if (pagesResponse.ok) {
        const pagesData = await pagesResponse.json();
        const page = pagesData.data?.[0];
        if (page) {
          pageId = page.id;
          pageAccessToken = page.access_token || accessToken;
          fbAccountName = page.name || fbAccountName;
        }
      }
    } catch {
      // Page might not be connected — not critical
    }

    // Save Instagram token (if IG business account found)
    if (igUserId) {
      await saveToken("instagram", {
        refresh_token: accessToken,
        access_token: accessToken,
        expires_at: Math.floor(Date.now() / 1000) + expiresIn,
        account_name: igAccountName,
        ig_user_id: igUserId,
      } as any);
    }

    // Save Facebook token (if page found)
    if (pageId) {
      await saveToken("facebook", {
        refresh_token: accessToken,
        access_token: pageAccessToken,
        expires_at: Math.floor(Date.now() / 1000) + expiresIn,
        account_name: fbAccountName,
        page_id: pageId,
        page_access_token: pageAccessToken,
      } as any);
    }

    // Redirect to settings with success indicator
    const connected = [igUserId && "instagram", pageId && "facebook"].filter(Boolean).join(",");
    const successResponse = NextResponse.redirect(`${appUrl}/settings?connected=${connected || "meta"}`);
    successResponse.cookies.delete("oauth_state_meta");
    return successResponse;
  } catch (err) {
    console.error("[META_CALLBACK] Error:", err);
    return NextResponse.redirect(`${appUrl}/settings?error=meta_failed`);
  }
}
