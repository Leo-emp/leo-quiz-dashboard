// ─────────────────────────────────────────────────────────────
//  OAuth token management for YouTube (and future TikTok).
//  Stores tokens in Vercel Blob as private JSON files.
//  Auto-refreshes expired access tokens using the refresh token.
//
//  "Connect once" pattern: user authorizes once via OAuth,
//  we store the refresh token, and auto-refresh access tokens
//  forever — no manual re-auth needed.
//
//  Token files in Blob:
//    tokens/youtube.json
//
//  Same pattern as Luminous Will's lib/tokens.ts.
// ─────────────────────────────────────────────────────────────

import { put, list, del } from "@vercel/blob";
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
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

export async function deleteToken(platform: string): Promise<void> {
  // Removes the token file from Blob — disconnects the platform
  try {
    const { blobs } = await list({ prefix: `${TOKEN_PREFIX}${platform}.json` });
    if (blobs.length > 0) {
      await del(blobs[0].url);
    }
  } catch {
    // Ignore errors — token may already be gone
  }
}

async function loadTokenData(platform: string): Promise<TokenData | null> {
  // Reads raw token data from Blob. Returns null if not connected.
  try {
    const { blobs } = await list({ prefix: `${TOKEN_PREFIX}${platform}.json` });
    if (blobs.length === 0) return null;

    // Fetch the blob content
    const response = await fetch(blobs[0].url);
    if (!response.ok) return null;
    return (await response.json()) as TokenData;
  } catch (err) {
    console.error(`[TOKENS] loadTokenData error for ${platform}:`, err);
    return null;
  }
}

export async function refreshAccessToken(
  platform: string,
  tokenData: TokenData
): Promise<TokenData | null> {
  // Exchanges the refresh token for a fresh access token.
  // Returns updated TokenData on success, null if refresh was rejected.
  const clientId = process.env.YOUTUBE_CLIENT_ID || "";
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET || "";

  try {
    const response = await fetch(YOUTUBE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: tokenData.refresh_token,
      }).toString(),
    });

    if (!response.ok) {
      console.error(`[TOKENS] Refresh failed for ${platform}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Build updated token data — some providers return a new refresh token
    const updated: TokenData = {
      refresh_token: data.refresh_token || tokenData.refresh_token,
      access_token: data.access_token,
      expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
      account_name: tokenData.account_name,
    };

    // Persist the refreshed tokens back to Blob
    await saveToken(platform, updated);

    return updated;
  } catch (error) {
    console.error(`[TOKENS] Refresh error for ${platform}:`, error);
    return null;
  }
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
  // Returns connection status for YouTube (and future platforms).
  // Used by the settings page to show connected/disconnected state.
  const platforms = ["youtube"];
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
