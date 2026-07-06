// ─────────────────────────────────────────────────────────────
//  GET /api/analytics/categories
//  Returns average views per quiz category for the bar chart.
//  Each entry: { category, avg_views, total_views }
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getCategoryAnalytics } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const categories = await getCategoryAnalytics();
  return NextResponse.json(categories);
}
