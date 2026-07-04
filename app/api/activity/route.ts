// ─────────────────────────────────────────────────────────────
//  GET /api/activity
//  Returns recent activity log entries for the dashboard feed.
//  Query params: limit (default 50)
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getRecentActivity } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit")) || 50;

  const entries = await getRecentActivity(limit);
  return NextResponse.json(entries);
}
