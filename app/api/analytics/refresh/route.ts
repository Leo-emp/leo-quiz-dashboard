// ─────────────────────────────────────────────────────────────
//  POST /api/analytics/refresh
//  Manual trigger for pulling analytics from all platforms.
//  Same logic as the daily cron, but callable from the dashboard.
//  Protected by admin session.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Call the pull-analytics cron internally
  const cronSecret = process.env.CRON_SECRET || "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const res = await fetch(`${appUrl}/api/cron/pull-analytics`, {
    method: "POST",
    headers: { authorization: `Bearer ${cronSecret}` },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to refresh analytics" }, { status: 500 });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
