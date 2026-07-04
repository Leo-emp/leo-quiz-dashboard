// ─────────────────────────────────────────────────────────────
//  GET /api/videos
//  Lists videos with optional filters and pagination.
//  Query params: status, category, trigger_type, search, offset, limit
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { listVideos } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { VideoFilters } from "@/lib/types";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse query parameters from the URL
  const url = new URL(request.url);

  const filters: VideoFilters = {
    status: url.searchParams.get("status") as VideoFilters["status"] || undefined,
    category: url.searchParams.get("category") as VideoFilters["category"] || undefined,
    trigger_type: url.searchParams.get("trigger_type") as VideoFilters["trigger_type"] || undefined,
    search: url.searchParams.get("search") || undefined,
    offset: Number(url.searchParams.get("offset")) || 0,
    limit: Number(url.searchParams.get("limit")) || 20,
  };

  const result = await listVideos(filters);
  return NextResponse.json(result);
}
