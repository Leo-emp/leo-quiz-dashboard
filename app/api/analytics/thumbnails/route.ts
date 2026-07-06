// ─────────────────────────────────────────────────────────────
//  GET /api/analytics/thumbnails?video_id=xxx
//  Returns thumbnail A/B test data for a specific video.
//  Used by the queue page to show which variant is performing best.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getThumbnailTests } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const videoId = url.searchParams.get("video_id");

  if (!videoId) {
    return NextResponse.json({ error: "Missing video_id" }, { status: 400 });
  }

  const tests = await getThumbnailTests(videoId);
  return NextResponse.json(tests);
}
