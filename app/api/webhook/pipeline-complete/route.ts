// ─────────────────────────────────────────────────────────────
//  POST /api/webhook/pipeline-complete
//  Called by the GitHub Action after video generation finishes.
//  Receives video + thumbnail Blob URLs and quiz metadata.
//  Updates the video record and moves it to "pending" status.
//
//  Protected by DASHBOARD_WEBHOOK_SECRET header.
//
//  Expected body:
//  {
//    video_id: string,
//    video_url: string,        // Vercel Blob URL
//    thumbnail_url: string,    // Vercel Blob URL
//    title: string,
//    description: string,
//    tags: string[],
//    hashtags: string[],
//    metadata_json: object,    // Full quiz pack data
//  }
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getVideo, updateVideo, logActivity } from "@/lib/db";

export async function POST(request: Request) {
  // -- Verify webhook secret --
  const secret = request.headers.get("x-webhook-secret");
  const expectedSecret = process.env.DASHBOARD_WEBHOOK_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // -- Parse the webhook payload --
  const body = await request.json().catch(() => null);
  if (!body || !body.video_id) {
    return NextResponse.json({ error: "Missing video_id" }, { status: 400 });
  }

  // -- Find the video record --
  const video = await getVideo(body.video_id);
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  // -- Update the video with pipeline results --
  const updated = await updateVideo(video.id, {
    status: "pending",
    video_url: body.video_url || null,
    thumbnail_url: body.thumbnail_url || null,
    title: body.title || null,
    description: body.description || null,
    tags: body.tags ? JSON.stringify(body.tags) : null,
    hashtags: body.hashtags ? JSON.stringify(body.hashtags) : null,
    metadata_json: body.metadata_json ? JSON.stringify(body.metadata_json) : null,
  });

  // -- Log the event --
  await logActivity(
    "generated",
    video.id,
    `Video ready for review: ${body.title || video.category}`
  );

  return NextResponse.json({ success: true, video: updated });
}
