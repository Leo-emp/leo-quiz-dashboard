// ─────────────────────────────────────────────────────────────
//  Database layer tests — uses in-memory SQLite.
//  Tests all CRUD operations, filters, stats, and activity log.
//  The vitest.setup.ts file configures in-memory mode automatically.
// ─────────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll } from "vitest";
import {
  initializeDatabase,
  createVideo,
  getVideo,
  updateVideo,
  listVideos,
  getScheduleConfig,
  updateScheduleConfig,
  logActivity,
  getRecentActivity,
  getVideoStats,
} from "../lib/db";

// Initialize the local DB before all tests
beforeAll(async () => {
  await initializeDatabase();
});

describe("Video CRUD", () => {
  it("creates and retrieves a video", async () => {
    // Create a new video record
    const video = await createVideo({
      category: "animals",
      trigger_type: "manual",
      rounds_count: 5,
    });

    // Verify it was created with defaults
    expect(video.id).toBeTruthy();
    expect(video.category).toBe("animals");
    expect(video.status).toBe("generating");
    expect(video.trigger_type).toBe("manual");
    expect(video.rounds_count).toBe(5);
    expect(video.platform).toBe("both");
    expect(video.created_at).toBeTruthy();

    // Retrieve it by ID
    const found = await getVideo(video.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(video.id);
  });

  it("updates specific fields on a video", async () => {
    const video = await createVideo({ category: "space" });

    // Update status and title
    const updated = await updateVideo(video.id, {
      status: "pending",
      title: "Guess the Planet!",
    });

    expect(updated.status).toBe("pending");
    expect(updated.title).toBe("Guess the Planet!");
    // Category should be unchanged
    expect(updated.category).toBe("space");
  });

  it("lists videos with filters", async () => {
    // Create videos with different categories
    await createVideo({ category: "dinosaurs", trigger_type: "automated" });
    await createVideo({ category: "dinosaurs", trigger_type: "manual" });

    // Filter by category
    const { videos, total } = await listVideos({ category: "dinosaurs" });
    expect(videos.length).toBeGreaterThanOrEqual(2);
    expect(total).toBeGreaterThanOrEqual(2);
    // All results should be dinosaurs
    videos.forEach((v) => expect(v.category).toBe("dinosaurs"));
  });

  it("returns null for non-existent video", async () => {
    const found = await getVideo("nonexistent-id");
    expect(found).toBeNull();
  });
});

describe("Schedule Config", () => {
  it("returns default config", async () => {
    const config = await getScheduleConfig();
    expect(config.id).toBe(1);
    expect(config.auto_enabled).toBe(false);
    expect(config.daily_hour_utc).toBe(6);
  });

  it("updates config fields", async () => {
    const updated = await updateScheduleConfig({
      auto_enabled: true,
      daily_hour_utc: 8,
    });
    expect(updated.auto_enabled).toBe(true);
    expect(updated.daily_hour_utc).toBe(8);
    expect(updated.updated_at).toBeTruthy();
  });
});

describe("Activity Log", () => {
  it("logs and retrieves activity", async () => {
    await logActivity("generated", null, "Test video generated");

    const recent = await getRecentActivity(5);
    expect(recent.length).toBeGreaterThanOrEqual(1);
    expect(recent[0].action).toBe("generated");
    expect(recent[0].message).toBe("Test video generated");
  });
});

describe("Dashboard Stats", () => {
  it("returns stats object with all fields", async () => {
    const stats = await getVideoStats();
    expect(stats).toHaveProperty("today");
    expect(stats).toHaveProperty("week");
    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("pending");
    expect(stats.total).toBeGreaterThanOrEqual(0);
  });
});
