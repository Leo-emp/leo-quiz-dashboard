// ─────────────────────────────────────────────────────────────
//  GET /api/schedule — Returns current schedule configuration
//  PUT /api/schedule — Updates schedule configuration
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getScheduleConfig, updateScheduleConfig } from "@/lib/db";

export async function GET() {
  const config = await getScheduleConfig();
  return NextResponse.json(config);
}

export async function PUT(request: Request) {
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
