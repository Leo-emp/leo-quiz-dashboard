// ─────────────────────────────────────────────────────────────
//  POST /api/videos/[id]/upload
//  Triggers the upload GitHub Action for an approved video.
//  Sends video URL + metadata to the upload workflow which
//  handles YouTube/TikTok publishing via the pipeline repo.
//  Protected by admin session + status gate + input validation.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getVideo, updateVideo, logActivity } from "@/lib/db";
import { triggerUploadWorkflow } from "@/lib/github";
import { getSession } from "@/lib/auth";

// -- Allowed platforms for upload --
const VALID_PLATFORMS = ["youtube", "tiktok", "both"];

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

  // -- Validate platform --
  const platform = VALID_PLATFORMS.includes(video.platform) ? video.platform : "youtube";

  // -- Parse and validate tags --
  let tags: string[] = [];
  try {
    const parsed = video.tags ? JSON.parse(video.tags) : [];
    if (Array.isArray(parsed)) {
      tags = parsed
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.slice(0, MAX_TAG_LENGTH))
        .slice(0, MAX_TAGS);
    }
  } catch {
    tags = [];
  }

  // -- Sanitize title and description --
  const title = (video.title || `Leo Quiz: ${video.category}`).slice(0, MAX_TITLE_LENGTH);
  const description = (video.description || "").slice(0, MAX_DESCRIPTION_LENGTH);

  // Trigger the upload workflow via GitHub Actions
  const runId = await triggerUploadWorkflow(
    video.id,
    video.video_url,
    { title, description, tags },
    platform
  );

  // Log failure if the workflow couldn't be triggered
  if (!runId) {
    await logActivity("failed", video.id, `Upload trigger failed: ${title}`);
    return NextResponse.json({ error: "Failed to trigger upload" }, { status: 500 });
  }

  // Mark as uploading to prevent duplicate triggers
  await updateVideo(video.id, { github_run_id: String(runId) });

  // Log the upload start
  await logActivity("uploaded", video.id, `Upload started: ${title}`);

  return NextResponse.json({ success: true, run_id: runId });
}
