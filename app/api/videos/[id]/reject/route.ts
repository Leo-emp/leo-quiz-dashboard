// ─────────────────────────────────────────────────────────────
//  POST /api/videos/[id]/reject
//  Rejects a pending video, moving it to history.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getVideo, updateVideo, logActivity } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const video = await getVideo(id);

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  if (video.status !== "pending") {
    return NextResponse.json(
      { error: `Cannot reject video with status "${video.status}"` },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const updated = await updateVideo(id, {
    status: "rejected",
    reviewed_at: now,
  });

  await logActivity("rejected", id, `Video rejected: ${video.title || video.category}`);
  return NextResponse.json(updated);
}
