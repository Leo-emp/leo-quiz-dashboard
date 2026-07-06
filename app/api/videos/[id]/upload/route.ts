// ─────────────────────────────────────────────────────────────
//  POST /api/videos/[id]/upload
//  Triggers upload to ALL connected platforms automatically.
//  Gets connected platforms via getConnectionStatus(), then
//  dispatches parallel upload workflows for each connected one.
//  Protected by admin session + status gate + input validation.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getVideo, updateVideo, logActivity } from "@/lib/db";
import { triggerUploadWorkflow } from "@/lib/github";
import { getConnectionStatus } from "@/lib/tokens";
import { getSession } from "@/lib/auth";

// -- Max lengths for workflow dispatch inputs --
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_TAG_LENGTH = 100;
const MAX_TAGS = 50;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // -- Auth check: require admin session --
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Await params (Next.js 16 async params)
  const { id } = await params;

  // Look up the video record
  const video = await getVideo(id);

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  // -- Status gate: only approved or scheduled videos can be uploaded --
  if (video.status !== "approved" && video.status !== "scheduled") {
    return NextResponse.json(
      { error: `Cannot upload video with status "${video.status}"` },
      { status: 400 }
    );
  }

  // Can only upload if we have a video file
  if (!video.video_url) {
    return NextResponse.json({ error: "No video file available" }, { status: 400 });
  }

  // -- Get all connected platforms --
  const connectionStatus = await getConnectionStatus();
  const connectedPlatforms = Object.entries(connectionStatus)
    .filter(([, status]) => status.connected)
    .map(([platform]) => platform);

  if (connectedPlatforms.length === 0) {
    return NextResponse.json(
      { error: "No platforms connected. Connect at least one in Settings." },
      { status: 400 }
    );
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

  // -- Parse default tags --
  let defaultTags: string[] = [];
  try {
    const parsed = video.tags ? JSON.parse(video.tags) : [];
    if (Array.isArray(parsed)) {
      defaultTags = parsed
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.slice(0, MAX_TAG_LENGTH))
        .slice(0, MAX_TAGS);
    }
  } catch {
    defaultTags = [];
  }

  // -- Default metadata --
  const defaultTitle = (video.title || `Leo Quiz: ${video.category}`).slice(0, MAX_TITLE_LENGTH);
  const defaultDescription = (video.description || "").slice(0, MAX_DESCRIPTION_LENGTH);

  // -- Dispatch upload to ALL connected platforms in parallel --
  const results = await Promise.allSettled(
    connectedPlatforms.map(async (platform) => {
      // Use platform-specific metadata if available, else default
      const meta = platformMetadata[platform] || {
        title: defaultTitle,
        description: defaultDescription,
        tags: defaultTags,
      };

      const runId = await triggerUploadWorkflow(
        video.id,
        video.video_url!,
        {
          title: (meta.title || defaultTitle).slice(0, MAX_TITLE_LENGTH),
          description: (meta.description || defaultDescription).slice(0, MAX_DESCRIPTION_LENGTH),
          tags: meta.tags || defaultTags,
        },
        platform
      );

      if (runId) {
        await logActivity("uploaded", video.id, `Upload started to ${platform}: ${meta.title || defaultTitle}`);
      }

      return { platform, runId };
    })
  );

  // -- Collect results --
  const uploads: Record<string, number | null> = {};
  let anySuccess = false;

  for (const result of results) {
    if (result.status === "fulfilled") {
      uploads[result.value.platform] = result.value.runId;
      if (result.value.runId) anySuccess = true;
    }
  }

  if (!anySuccess) {
    await logActivity("failed", video.id, `Upload trigger failed to all platforms`);
    return NextResponse.json({ error: "Failed to trigger upload to any platform" }, { status: 500 });
  }

  // Store the first successful run ID for status polling
  const firstRunId = Object.values(uploads).find((id) => id !== null);
  if (firstRunId) {
    await updateVideo(video.id, { github_run_id: String(firstRunId) });
  }

  return NextResponse.json({
    success: true,
    platforms: uploads,
    connected: connectedPlatforms,
  });
}
