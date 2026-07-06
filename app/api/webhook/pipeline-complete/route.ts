// ─────────────────────────────────────────────────────────────
//  POST /api/webhook/pipeline-complete
//  Called by the GitHub Action after video generation finishes.
//  Receives video + thumbnail Blob URLs and quiz metadata.
//  Supports 3 thumbnail variants + per-platform metadata.
//  Updates the video record and moves it to "pending" status.
//
//  Protected by DASHBOARD_WEBHOOK_SECRET header.
//
//  Expected body:
//  {
//    video_id: string,
//    video_url: string,           // Vercel Blob URL
//    thumbnail_url: string,       // Best thumbnail (Gemini-selected)
//    thumbnail_urls: { a, b, c }, // All 3 variants
//    selected_thumbnail: string,  // Which variant was selected ("a", "b", "c")
//    platform_metadata: {         // Per-platform metadata
//      youtube: { title, description, tags, hashtags },
//      tiktok: { title, description, hashtags },
//      instagram: { caption, hashtags },
//      facebook: { title, description },
//    },
//    title: string,
//    description: string,
//    tags: string[],
//    hashtags: string[],
//    metadata_json: object,
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

  // -- Handle thumbnail variants --
  // Accept either 3 variants or single thumbnail_url (backwards compat)
  const thumbnailUrls = body.thumbnail_urls || {
    a: body.thumbnail_url,
    b: null,
    c: null,
  };
  const selectedVariant = body.selected_thumbnail || "a";
  const bestThumbnail = thumbnailUrls[selectedVariant] || body.thumbnail_url || null;

  // -- Handle per-platform metadata --
  const platformMetadata = body.platform_metadata || {};

  // -- Build the metadata_json with thumbnail variants included --
  const metadataObj = body.metadata_json ? (typeof body.metadata_json === "string" ? JSON.parse(body.metadata_json) : body.metadata_json) : {};
  metadataObj.thumbnail_urls = thumbnailUrls;
  metadataObj.selected_thumbnail = selectedVariant;

  // -- Handle upload result (from upload workflow callback) --
  if (body.status === "uploaded") {
    const platformUrlField = body.platform ? `${body.platform}_url` : null;
    const updates: Record<string, string | null> = {};
    if (platformUrlField && body.upload_url) {
      updates[platformUrlField] = body.upload_url;
    }
    if (Object.keys(updates).length > 0) {
      await updateVideo(video.id, updates);
      await logActivity("uploaded", video.id, `Uploaded to ${body.platform}: ${body.upload_url}`);
    }
    return NextResponse.json({ success: true });
  }

  // -- Update the video with pipeline results --
  await updateVideo(video.id, {
    status: "pending",
    video_url: body.video_url || null,
    thumbnail_url: bestThumbnail,
    title: body.title || null,
    description: body.description || null,
    tags: body.tags ? JSON.stringify(body.tags) : null,
    hashtags: body.hashtags ? JSON.stringify(body.hashtags) : null,
    metadata_json: JSON.stringify(metadataObj),
    platform_metadata: Object.keys(platformMetadata).length > 0
      ? JSON.stringify(platformMetadata)
      : null,
  });

  // -- Log the event --
  await logActivity(
    "generated",
    video.id,
    `Video ready for review: ${body.title || video.category}`
  );

  return NextResponse.json({ success: true });
}
