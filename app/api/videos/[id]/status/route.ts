// ─────────────────────────────────────────────────────────────
//  GET /api/videos/[id]/status
//  Polls the GitHub Actions API for the workflow run status.
//  Used by the Generate page to show progress updates.
//  Returns: { status, conclusion, video_status }
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getVideo } from "@/lib/db";
import { getWorkflowRunStatus } from "@/lib/github";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const video = await getVideo(id);

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  // If video has no GitHub run ID, return current DB status
  if (!video.github_run_id) {
    return NextResponse.json({
      video_status: video.status,
      github_status: null,
      github_conclusion: null,
    });
  }

  // Poll GitHub Actions for the current workflow run status
  const runStatus = await getWorkflowRunStatus(Number(video.github_run_id));

  return NextResponse.json({
    video_status: video.status,
    github_status: runStatus.status,
    github_conclusion: runStatus.conclusion,
  });
}
