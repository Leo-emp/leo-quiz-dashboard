// ─────────────────────────────────────────────────────────────
//  Video lifecycle tests — covers the full flow from creation
//  through approval/rejection, scheduling, and upload tracking.
// ─────────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll } from "vitest";
import {
  initializeDatabase,
  createVideo,
  getVideo,
  updateVideo,
  listVideos,
  logActivity,
  getRecentActivity,
} from "../lib/db";

beforeAll(async () => {
  await initializeDatabase();
});

describe("Video lifecycle: create → approve → upload", () => {
  it("creates a video in generating status", async () => {
    const video = await createVideo({
      category: "animals",
      trigger_type: "automated",
      rounds_count: 10,
    });
    expect(video.status).toBe("generating");
    expect(video.rounds_count).toBe(10);
    expect(video.trigger_type).toBe("automated");
  });

  it("transitions generating → pending when pipeline completes", async () => {
    const video = await createVideo({ category: "space" });
    const updated = await updateVideo(video.id, {
      status: "pending",
      title: "Guess the Planet!",
      video_url: "https://blob.vercel-storage.com/test.mp4",
      thumbnail_url: "https://blob.vercel-storage.com/thumb.png",
    });
    expect(updated.status).toBe("pending");
    expect(updated.video_url).toBe("https://blob.vercel-storage.com/test.mp4");
  });

  it("transitions pending → approved", async () => {
    const video = await createVideo({ category: "ocean" });
    await updateVideo(video.id, { status: "pending" });
    const approved = await updateVideo(video.id, {
      status: "approved",
      reviewed_at: new Date().toISOString(),
    });
    expect(approved.status).toBe("approved");
    expect(approved.reviewed_at).toBeTruthy();
  });

  it("transitions pending → scheduled with scheduled_at", async () => {
    const video = await createVideo({ category: "dinosaurs" });
    await updateVideo(video.id, { status: "pending" });
    const future = new Date(Date.now() + 86400000).toISOString();
    const scheduled = await updateVideo(video.id, {
      status: "scheduled",
      scheduled_at: future,
      reviewed_at: new Date().toISOString(),
    });
    expect(scheduled.status).toBe("scheduled");
    expect(scheduled.scheduled_at).toBe(future);
  });

  it("tracks platform upload URLs independently", async () => {
    const video = await createVideo({ category: "animals" });
    await updateVideo(video.id, { status: "approved" });

    const withYT = await updateVideo(video.id, {
      youtube_url: "https://youtube.com/watch?v=abc123",
    });
    expect(withYT.youtube_url).toBe("https://youtube.com/watch?v=abc123");
    expect(withYT.tiktok_url).toBeFalsy();

    const withTT = await updateVideo(video.id, {
      tiktok_url: "https://tiktok.com/@leoquiz/video/123",
    });
    expect(withTT.youtube_url).toBe("https://youtube.com/watch?v=abc123");
    expect(withTT.tiktok_url).toBe("https://tiktok.com/@leoquiz/video/123");
  });
});

describe("Video lifecycle: create → reject", () => {
  it("transitions pending → rejected", async () => {
    const video = await createVideo({ category: "bugs" });
    await updateVideo(video.id, { status: "pending" });
    const rejected = await updateVideo(video.id, {
      status: "rejected",
      reviewed_at: new Date().toISOString(),
    });
    expect(rejected.status).toBe("rejected");
  });
});

describe("Video listing and filters", () => {
  it("paginates with offset and limit", async () => {
    const { videos: page1 } = await listVideos({ limit: 2, offset: 0 });
    const { videos: page2 } = await listVideos({ limit: 2, offset: 2 });
    expect(page1.length).toBeLessThanOrEqual(2);
    if (page2.length > 0) {
      expect(page1[0].id).not.toBe(page2[0].id);
    }
  });

  it("filters by status", async () => {
    await createVideo({ category: "animals", status: "generating" });
    const { videos } = await listVideos({ status: "generating" });
    videos.forEach((v) => expect(v.status).toBe("generating"));
  });

  it("filters by trigger_type", async () => {
    await createVideo({ category: "space", trigger_type: "manual" });
    const { videos } = await listVideos({ trigger_type: "manual" });
    videos.forEach((v) => expect(v.trigger_type).toBe("manual"));
  });

  it("returns total count independent of pagination", async () => {
    const { total: totalFull } = await listVideos({});
    const { total: totalPaged } = await listVideos({ limit: 1 });
    expect(totalPaged).toBe(totalFull);
  });
});

describe("Activity log tracks video events", () => {
  it("logs approve and reject events with video IDs", async () => {
    const video = await createVideo({ category: "dinosaurs" });
    await logActivity("approved", video.id, "Video approved: dinosaurs");
    await logActivity("rejected", video.id, "Video rejected: dinosaurs");

    const recent = await getRecentActivity(10);
    const forVideo = recent.filter((a) => a.video_id === video.id);
    expect(forVideo.length).toBe(2);
    expect(forVideo.map((a) => a.action)).toContain("approved");
    expect(forVideo.map((a) => a.action)).toContain("rejected");
  });

  it("logs generated events without a video ID", async () => {
    await logActivity("generated", null, "Daily generation triggered");
    const recent = await getRecentActivity(5);
    expect(recent[0].action).toBe("generated");
    expect(recent[0].video_id).toBeNull();
  });

  it("respects the limit parameter", async () => {
    for (let i = 0; i < 5; i++) {
      await logActivity("test", null, `Event ${i}`);
    }
    const limited = await getRecentActivity(3);
    expect(limited.length).toBeLessThanOrEqual(3);
  });
});
