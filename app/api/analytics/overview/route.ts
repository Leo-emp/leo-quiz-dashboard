// ─────────────────────────────────────────────────────────────
//  GET /api/analytics/overview
//  Returns aggregate analytics: total views, subscribers per
//  platform, videos this week, average CTR.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getAnalyticsOverview } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const overview = await getAnalyticsOverview();
  return NextResponse.json(overview);
}
