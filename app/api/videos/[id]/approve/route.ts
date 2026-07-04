// ─────────────────────────────────────────────────────────────
//  POST /api/videos/[id]/approve
//  Approves a pending video. Optionally schedule for later posting.
//  Body: { scheduled_at?: string } — ISO timestamp for scheduled posting
//  If no scheduled_at: status → "approved" (post immediately)
//  If scheduled_at provided: status → "scheduled"
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getVideo, updateVideo, logActivity } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const video = await getVideo(id);

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  // Only pending videos can be approved
  if (video.status !== "pending") {
    return NextResponse.json(
      { error: `Cannot approve video with status "${video.status}"` },
      { status: 400 }
    );
  }

  // Check if a scheduled time was provided
  const body = await request.json().catch(() => ({}));
  const scheduledAt = body.scheduled_at as string | undefined;
  const now = new Date().toISOString();

  if (scheduledAt) {
    // Schedule for later
    const updated = await updateVideo(id, {
      status: "scheduled",
      scheduled_at: scheduledAt,
      reviewed_at: now,
    });
    await logActivity("scheduled", id, `Video scheduled: ${video.title || video.category}`);
    return NextResponse.json(updated);
  } else {
    // Approve for immediate posting
    const updated = await updateVideo(id, {
      status: "approved",
      reviewed_at: now,
    });
    await logActivity("approved", id, `Video approved: ${video.title || video.category}`);
    return NextResponse.json(updated);
  }
}
