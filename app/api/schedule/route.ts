// ─────────────────────────────────────────────────────────────
//  GET /api/schedule — Returns current schedule configuration
//  PUT /api/schedule — Updates schedule configuration
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getScheduleConfig, updateScheduleConfig } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await getScheduleConfig();
  return NextResponse.json(config);
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  const config = await updateScheduleConfig({
    auto_enabled: body.auto_enabled,
    daily_hour_utc: body.daily_hour_utc,
    daily_minute_utc: body.daily_minute_utc,
    weekly_day: body.weekly_day,
    weekly_hour_utc: body.weekly_hour_utc,
  });

  return NextResponse.json(config);
}
