// ─────────────────────────────────────────────────────────────
//  GET /api/analytics/top-videos?limit=10&platform=youtube
//  Returns top-performing videos sorted by total views.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getTopVideos } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 10), 50);
  const platform = url.searchParams.get("platform") || undefined;

  const videos = await getTopVideos(limit, platform);
  return NextResponse.json(videos);
}
