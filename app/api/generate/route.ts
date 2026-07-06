// ─────────────────────────────────────────────────────────────
//  POST /api/generate
//  Creates a new video record and triggers the pipeline via
//  GitHub Actions workflow_dispatch.
//  Body: { category?: string, rounds?: number, trigger_type?: string }
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { createVideo, updateVideo, logActivity } from "@/lib/db";
import { triggerWorkflow } from "@/lib/github";
import { getSession } from "@/lib/auth";
import type { Category, TriggerType, VideoFormat } from "@/lib/types";

// -- Valid categories (matches pipeline config.py) --
const VALID_CATEGORIES = ["animals", "dinosaurs", "space", "vehicles", "fruits", "flags"];

// -- Day-of-week rotation for "auto" category --
const DAY_CATEGORIES: Category[] = [
  "animals", "dinosaurs", "space", "vehicles", "fruits", "flags",
];

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  // Determine category — "auto" picks today's rotation
  let category = body.category as string;
  if (!category || category === "auto") {
    const dayIndex = new Date().getDay();
    // Sunday = 0 in JS → map to our rotation (Mon=0 in pipeline)
    const adjustedDay = dayIndex === 0 ? 6 : dayIndex - 1;
    category = DAY_CATEGORIES[adjustedDay % 6];
  }

  // Validate category
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json(
      { error: `Invalid category: ${category}` },
      { status: 400 }
    );
  }

  const triggerType = (body.trigger_type || "manual") as TriggerType;
  const format = (body.format || "short") as string;

  // -- Daily bundle: create TWO videos (short + long-form) --
  if (format === "daily_bundle") {
    // Short video: 6 rounds, 9:16
    const shortVideo = await createVideo({
      category: category as Category,
      trigger_type: triggerType,
      rounds_count: 6,
      video_format: "short" as VideoFormat,
      status: "generating",
    });
    const shortRunId = await triggerWorkflow(shortVideo.id, category, 6, "short");
    if (shortRunId) {
      await updateVideo(shortVideo.id, { github_run_id: String(shortRunId) });
    } else {
      await updateVideo(shortVideo.id, { status: "failed" });
    }

    // Long-form video: 60 rounds, 16:9
    const longVideo = await createVideo({
      category: category as Category,
      trigger_type: triggerType,
      rounds_count: 60,
      video_format: "long" as VideoFormat,
      status: "generating",
    });
    const longRunId = await triggerWorkflow(longVideo.id, category, 60, "long");
    if (longRunId) {
      await updateVideo(longVideo.id, { github_run_id: String(longRunId) });
    } else {
      await updateVideo(longVideo.id, { status: "failed" });
    }

    await logActivity("generated", shortVideo.id, `Daily bundle started: ${category} (short + long-form)`);
    return NextResponse.json({
      videos: [
        { video_id: shortVideo.id, format: "short", github_run_id: shortRunId },
        { video_id: longVideo.id, format: "long", github_run_id: longRunId },
      ],
      status: "generating",
    });
  }

  // -- Single format: short, long, or mega --
  const formatConfig: Record<string, { rounds: number; videoFormat: VideoFormat }> = {
    short: { rounds: 6, videoFormat: "short" },
    long: { rounds: 60, videoFormat: "long" },
    mega: { rounds: 100, videoFormat: "mega" },
  };
  const config = formatConfig[format] || formatConfig.short;
  const rounds = body.rounds || config.rounds;

  // Step 1: Create video record in DB with status "generating"
  const video = await createVideo({
    category: category as Category,
    trigger_type: triggerType,
    rounds_count: rounds,
    video_format: config.videoFormat,
    status: "generating",
  });

  // Step 2: Trigger the pipeline GitHub Action
  const runId = await triggerWorkflow(video.id, category, rounds, format);

  if (runId) {
    // Store the run ID so we can poll for status
    await updateVideo(video.id, { github_run_id: String(runId) });
  } else {
    // Workflow trigger failed
    await updateVideo(video.id, { status: "failed" });
    await logActivity("failed", video.id, `Pipeline trigger failed for ${category}`);
    return NextResponse.json(
      { error: "Failed to trigger pipeline", video_id: video.id },
      { status: 500 }
    );
  }

  await logActivity("generated", video.id, `Video generation started: ${category} ${format} (${rounds} rounds)`);

  return NextResponse.json({
    video_id: video.id,
    github_run_id: runId,
    status: "generating",
  });
}
