// ─────────────────────────────────────────────────────────────
//  GET /api/videos/[id] — Fetch a single video by ID
//  PATCH /api/videos/[id] — Update video metadata (title, desc, tags, etc.)
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getVideo, updateVideo } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const video = await getVideo(id);

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  return NextResponse.json(video);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Check video exists
  const existing = await getVideo(id);
  if (!existing) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  // Parse update fields from request body
  const body = await request.json().catch(() => ({}));
  const allowedFields = ["title", "description", "tags", "hashtags", "platform", "scheduled_at"];
  const updates: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  const updated = await updateVideo(id, updates);
  return NextResponse.json(updated);
}
