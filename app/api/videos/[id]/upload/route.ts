// ─────────────────────────────────────────────────────────────
//  POST /api/videos/[id]/upload
//  Triggers the upload GitHub Action for an approved video.
//  Sends video URL + metadata to the upload workflow which
//  handles YouTube/TikTok publishing via the pipeline repo.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getVideo, logActivity } from "@/lib/db";
import { triggerUploadWorkflow } from "@/lib/github";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Await params (Next.js 16 async params)
  const { id } = await params;

  // Look up the video record
  const video = await getVideo(id);

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  // Can only upload if we have a video file
  if (!video.video_url) {
    return NextResponse.json({ error: "No video file available" }, { status: 400 });
  }

  // Parse tags from JSON string stored in DB
  const tags = video.tags ? JSON.parse(video.tags) : [];

  // Trigger the upload workflow via GitHub Actions
  const runId = await triggerUploadWorkflow(
    video.id,
    video.video_url,
    {
      title: video.title || `Leo Quiz: ${video.category}`,
      description: video.description || "",
      tags,
    },
    video.platform
  );

  // Log failure if the workflow couldn't be triggered
  if (!runId) {
    await logActivity("failed", video.id, `Upload trigger failed: ${video.title || video.category}`);
    return NextResponse.json({ error: "Failed to trigger upload" }, { status: 500 });
  }

  // Log the upload start
  await logActivity("uploaded", video.id, `Upload started: ${video.title || video.category}`);

  return NextResponse.json({ success: true, run_id: runId });
}
