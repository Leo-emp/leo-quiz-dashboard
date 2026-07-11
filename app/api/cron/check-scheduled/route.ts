// ─────────────────────────────────────────────────────────────
//  POST /api/cron/check-scheduled
//  Vercel Cron job — runs every 15 minutes.
//  Finds videos where status = "scheduled" and scheduled_at <= now.
//  Triggers upload to ALL connected platforms for each due video.
//  "Schedule once → auto-post everywhere."
//  Protected by CRON_SECRET header.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { listVideos, updateVideo, logActivity } from "@/lib/db";
import { triggerUploadWorkflow } from "@/lib/github";
import { getConnectionStatus } from "@/lib/tokens";
import { notifyAdmin } from "@/lib/notify-admin";

export async function POST(request: Request) {
  // -- Verify cron secret (Vercel sends this automatically) --
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // # Top-level try/catch — catches fatal errors from getConnectionStatus() or listVideos()
  try {

  // -- Get all connected platforms once (shared across all videos) --
  const connectionStatus = await getConnectionStatus();
  const connectedPlatforms = Object.entries(connectionStatus)
    .filter(([, status]) => status.connected)
    .map(([platform]) => platform);

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
      // # Alert admin when a scheduled video has no file attached
      await notifyAdmin("Check Scheduled", new Error("No video file"), { videoId: video.id, title: video.title });
      continue;
    }

    // Skip if no platforms connected
    if (connectedPlatforms.length === 0) {
      await logActivity("failed", video.id, `No platforms connected for scheduled post: ${video.title}`);
      continue;
    }

    // -- Parse platform-specific metadata if available --
    let platformMetadata: Record<string, { title: string; description: string; tags: string[] }> = {};
    try {
      if (video.platform_metadata) {
        platformMetadata = JSON.parse(video.platform_metadata);
      }
    } catch {
      // Fall back to generic metadata
    }

    // Parse default tags
    const defaultTags = video.tags ? JSON.parse(video.tags) : [];
    const defaultTitle = video.title || `Leo Quiz: ${video.category}`;
    const defaultDescription = video.description || "";

    // -- Dispatch upload to ALL connected platforms --
    const results = await Promise.allSettled(
      connectedPlatforms.map(async (platform) => {
        const meta = platformMetadata[platform] || {
          title: defaultTitle,
          description: defaultDescription,
          tags: defaultTags,
        };

        return triggerUploadWorkflow(
          video.id,
          video.video_url!,
          {
            title: meta.title || defaultTitle,
            description: meta.description || defaultDescription,
            tags: meta.tags || defaultTags,
          },
          platform
        );
      })
    );

    // Check if at least one platform dispatch succeeded
    const anySuccess = results.some(
      (r) => r.status === "fulfilled" && r.value !== null
    );

    if (anySuccess) {
      await updateVideo(video.id, { status: "approved" });
      await logActivity(
        "uploaded",
        video.id,
        `Scheduled upload started to ${connectedPlatforms.join(", ")}: ${defaultTitle}`
      );
      triggered++;
    } else {
      await logActivity("failed", video.id, `Scheduled upload trigger failed: ${defaultTitle}`);
      // # Alert admin when ALL platform uploads fail for a video
      await notifyAdmin("Check Scheduled", new Error("All platform uploads failed"), {
        videoId: video.id,
        title: defaultTitle,
        platforms: connectedPlatforms,
      });
    }
  }

  return NextResponse.json({
    checked: videos.length,
    triggered,
    platforms_connected: connectedPlatforms.length,
    timestamp: now.toISOString(),
  });

  } catch (err) {
    // # Fatal error — alert admin and return 500
    console.error("[CheckScheduled] Fatal error:", err);
    await notifyAdmin("Check Scheduled", err, { fatal: true });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
