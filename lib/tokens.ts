// ─────────────────────────────────────────────────────────────
//  OAuth token management for all 4 platforms:
//  YouTube, TikTok, Instagram, Facebook.
//  Stores tokens in Vercel Blob as private JSON files.
//  Auto-refreshes expired access tokens using the refresh token.
//
//  "Connect once" pattern: user authorizes once via OAuth,
//  we store the refresh token, and auto-refresh access tokens
//  forever — no manual re-auth needed.
//
//  Token files in Blob:
//    tokens/youtube.json
//    tokens/tiktok.json
//    tokens/instagram.json
//    tokens/facebook.json
// ─────────────────────────────────────────────────────────────

import { put, list, del, get } from "@vercel/blob";
import type { TokenData, ConnectionStatus } from "./types";

// -- Blob path prefix for all token files --
const TOKEN_PREFIX = "tokens/";

// -- Refresh 5 minutes before actual expiry --
// Prevents edge cases where token expires mid-upload
const REFRESH_BUFFER_SECONDS = 300;

// -- YouTube OAuth token endpoint --
const YOUTUBE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function saveToken(platform: string, data: TokenData): Promise<void> {
  // Writes token data to Blob as a JSON file.
  // Uses addRandomSuffix: false so we can overwrite on refresh.
  const path = `${TOKEN_PREFIX}${platform}.json`;
  await put(path, JSON.stringify(data), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

export async function deleteToken(platform: string): Promise<void> {
  // Removes the token file from Blob — disconnects the platform
  try {
    const path = `${TOKEN_PREFIX}${platform}.json`;
    await del(path);
  } catch {
    // Ignore errors — token may already be gone
  }
}

async function loadTokenData(platform: string): Promise<TokenData | null> {
  // Reads raw token data from private Blob. Returns null if not connected.
  try {
    const path = `${TOKEN_PREFIX}${platform}.json`;
    const result = await get(path, { access: "private" });
    if (!result || !result.stream) return null;

    // Read the stream as text, then parse JSON
    const response = new Response(result.stream);
    const text = await response.text();
    return JSON.parse(text) as TokenData;
  } catch (err) {
    console.error(`[TOKENS] loadTokenData error for ${platform}:`, err);
    return null;
  }
}

export async function refreshAccessToken(
  platform: string,
  tokenData: TokenData
): Promise<TokenData | null> {
  // Dispatches to the correct refresh endpoint based on platform.
  // Returns updated TokenData on success, null if refresh was rejected.
  try {
    if (platform === "tiktok") {
      return await refreshTikTokToken(tokenData);
    } else if (platform === "instagram" || platform === "facebook") {
      return await refreshMetaToken(platform, tokenData);
    } else {
      return await refreshYouTubeToken(tokenData);
    }
  } catch (error) {
    console.error(`[TOKENS] Refresh error for ${platform}:`, error);
    return null;
  }
}

async function refreshYouTubeToken(tokenData: TokenData): Promise<TokenData | null> {
  // YouTube: standard OAuth2 refresh_token grant
  const response = await fetch(YOUTUBE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID || "",
      client_secret: process.env.YOUTUBE_CLIENT_SECRET || "",
      grant_type: "refresh_token",
      refresh_token: tokenData.refresh_token,
    }).toString(),
  });

  if (!response.ok) {
    console.error(`[TOKENS] YouTube refresh failed: ${response.status}`);
    return null;
  }

  const data = await response.json();
  const updated: TokenData = {
    refresh_token: data.refresh_token || tokenData.refresh_token,
    access_token: data.access_token,
    expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
    account_name: tokenData.account_name,
  };

  await saveToken("youtube", updated);
  return updated;
}

async function refreshTikTokToken(tokenData: TokenData): Promise<TokenData | null> {
  // TikTok: uses its own token refresh endpoint
  const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY || "",
      client_secret: process.env.TIKTOK_CLIENT_SECRET || "",
      grant_type: "refresh_token",
      refresh_token: tokenData.refresh_token,
    }).toString(),
  });

  if (!response.ok) {
    console.error(`[TOKENS] TikTok refresh failed: ${response.status}`);
    return null;
  }

  const data = await response.json();
  const updated: TokenData = {
    refresh_token: data.refresh_token || tokenData.refresh_token,
    access_token: data.access_token,
    expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 86400),
    account_name: tokenData.account_name,
  };

  await saveToken("tiktok", updated);
  return updated;
}

async function refreshMetaToken(platform: string, tokenData: TokenData): Promise<TokenData | null> {
  // Meta (Instagram/Facebook): exchange for a fresh long-lived token
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID || "",
    client_secret: process.env.META_APP_SECRET || "",
    fb_exchange_token: tokenData.access_token,
  });

  const response = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?${params.toString()}`
  );

  if (!response.ok) {
    console.error(`[TOKENS] Meta refresh failed for ${platform}: ${response.status}`);
    return null;
  }

  const data = await response.json();
  const updated: TokenData = {
    ...tokenData,
    access_token: data.access_token,
    expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 5184000),
  };

  await saveToken(platform, updated);
  return updated;
}

export async function getToken(platform: string): Promise<TokenData | null> {
  // Reads the token for a platform, auto-refreshing if expired.
  // Returns null if not connected or if refresh fails (needs reconnect).
  const tokenData = await loadTokenData(platform);
  if (!tokenData) return null;

  // Check if access token is still valid (with 5-min buffer)
  const now = Math.floor(Date.now() / 1000);
  if (tokenData.expires_at > now + REFRESH_BUFFER_SECONDS) {
    // Token is still fresh — use it
    return tokenData;
  }

  // Access token expired — refresh it
  const refreshed = await refreshAccessToken(platform, tokenData);
  return refreshed;
}

export async function getConnectionStatus(): Promise<Record<string, ConnectionStatus>> {
  // Returns connection status for all 4 platforms.
  // Used by the settings page to show connected/disconnected state.
  const platforms = ["youtube", "tiktok", "instagram", "facebook"];
  const result: Record<string, ConnectionStatus> = {};

  for (const platform of platforms) {
    const tokenData = await loadTokenData(platform);

    if (!tokenData) {
      result[platform] = { connected: false };
      continue;
    }

    // Check if access token can be refreshed
    const now = Math.floor(Date.now() / 1000);
    if (tokenData.expires_at <= now + REFRESH_BUFFER_SECONDS) {
      const refreshed = await refreshAccessToken(platform, tokenData);
      if (!refreshed) {
        result[platform] = {
          connected: false,
          account_name: tokenData.account_name,
          needs_reconnect: true,
        };
        continue;
      }
    }

    result[platform] = {
      connected: true,
      account_name: tokenData.account_name,
    };
  }

  return result;
}
