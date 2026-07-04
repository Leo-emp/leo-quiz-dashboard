// ─────────────────────────────────────────────────────────────
//  POST /api/cron/check-scheduled
//  Vercel Cron job — runs every 15 minutes.
//  Finds videos where status = "scheduled" and scheduled_at <= now.
//  Triggers the upload GitHub Action for each due video.
//  Protected by CRON_SECRET header.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { listVideos, updateVideo, logActivity } from "@/lib/db";
import { triggerUploadWorkflow } from "@/lib/github";

export async function POST(request: Request) {
  // -- Verify cron secret (Vercel sends this automatically) --
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // -- Find all scheduled videos --
  const { videos } = await listVideos({ status: "scheduled", limit: 50 });
  const now = new Date();

  let triggered = 0;

  for (const video of videos) {
    // Skip if not yet due
    if (!video.scheduled_at || new Date(video.scheduled_at) > now) {
      continue;
    }

    // Skip if no video file — mark as failed
    if (!video.video_url) {
      await updateVideo(video.id, { status: "failed" });
      await logActivity("failed", video.id, `No video file for scheduled post: ${video.title}`);
      continue;
    }

    // Parse tags from JSON string
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

    if (runId) {
      // Move from scheduled → approved (upload in progress)
      await updateVideo(video.id, { status: "approved" });
      await logActivity("uploaded", video.id, `Scheduled upload started: ${video.title}`);
      triggered++;
    } else {
      await logActivity("failed", video.id, `Scheduled upload trigger failed: ${video.title}`);
    }
  }

  return NextResponse.json({
    checked: videos.length,
    triggered,
    timestamp: now.toISOString(),
  });
}
