// ─────────────────────────────────────────────────────────────
//  GET /api/analytics/views?period=7d&platform=youtube
//  Returns daily view counts as a time series array for charting.
//  Each entry: { date, youtube, tiktok, instagram, facebook }
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getChannelAnalytics } from "@/lib/db";
import { getSession } from "@/lib/auth";

// -- Map period string to number of days --
const PERIOD_DAYS: Record<string, number> = {
  "7d": 7, "30d": 30, "90d": 90, "all": 365,
};

const PLATFORMS = ["youtube", "tiktok", "instagram", "facebook"];

export async function GET(request: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const period = url.searchParams.get("period") || "30d";
  const days = PERIOD_DAYS[period] || 30;

  // Fetch channel analytics for all platforms
  const allData = await Promise.all(
    PLATFORMS.map(async (platform) => ({
      platform,
      data: await getChannelAnalytics(platform, days),
    }))
  );

  // Merge into a single time series keyed by date
  const dateMap: Record<string, Record<string, number>> = {};

  for (const { platform, data } of allData) {
    for (const entry of data) {
      if (!dateMap[entry.date]) {
        dateMap[entry.date] = { youtube: 0, tiktok: 0, instagram: 0, facebook: 0 };
      }
      dateMap[entry.date][platform] = entry.total_views;
    }
  }

  // Sort by date ascending
  const series = Object.entries(dateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, views]) => ({ date, ...views }));

  return NextResponse.json(series);
}
