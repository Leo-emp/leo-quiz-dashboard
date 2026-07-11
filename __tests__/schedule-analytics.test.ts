// ─────────────────────────────────────────────────────────────
//  Schedule config and analytics tests.
//  Verifies schedule CRUD, analytics aggregation, and stats.
// ─────────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll } from "vitest";
import {
  initializeDatabase,
  createVideo,
  updateVideo,
  getScheduleConfig,
  updateScheduleConfig,
  getVideoStats,
  getAnalyticsOverview,
} from "../lib/db";

beforeAll(async () => {
  await initializeDatabase();
});

describe("Schedule configuration", () => {
  it("returns defaults on first read", async () => {
    const config = await getScheduleConfig();
    expect(config.id).toBe(1);
    expect(config.auto_enabled).toBe(false);
    expect(config.daily_hour_utc).toBeTypeOf("number");
  });

  it("updates auto_enabled toggle", async () => {
    const updated = await updateScheduleConfig({ auto_enabled: true });
    expect(updated.auto_enabled).toBe(true);

    const readBack = await getScheduleConfig();
    expect(readBack.auto_enabled).toBe(true);

    await updateScheduleConfig({ auto_enabled: false });
  });

  it("updates daily schedule time", async () => {
    const updated = await updateScheduleConfig({
      daily_hour_utc: 14,
      daily_minute_utc: 30,
    });
    expect(updated.daily_hour_utc).toBe(14);
    expect(updated.daily_minute_utc).toBe(30);
  });

  it("updates weekly schedule day", async () => {
    const updated = await updateScheduleConfig({
      weekly_day: 5,
      weekly_hour_utc: 12,
    });
    expect(updated.weekly_day).toBe(5);
    expect(updated.weekly_hour_utc).toBe(12);
  });

  it("preserves fields not included in update", async () => {
    await updateScheduleConfig({ daily_hour_utc: 9 });
    const config = await getScheduleConfig();
    const originalWeeklyDay = config.weekly_day;

    await updateScheduleConfig({ daily_hour_utc: 10 });
    const after = await getScheduleConfig();
    expect(after.daily_hour_utc).toBe(10);
    expect(after.weekly_day).toBe(originalWeeklyDay);
  });
});

describe("Dashboard stats", () => {
  it("returns all required stat fields", async () => {
    const stats = await getVideoStats();
    expect(stats).toHaveProperty("today");
    expect(stats).toHaveProperty("week");
    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("pending");
    expect(typeof stats.today).toBe("number");
    expect(typeof stats.week).toBe("number");
    expect(typeof stats.total).toBe("number");
    expect(typeof stats.pending).toBe("number");
  });

  it("increments total after creating a video", async () => {
    const before = await getVideoStats();
    await createVideo({ category: "animals" });
    const after = await getVideoStats();
    expect(after.total).toBe(before.total + 1);
  });

  it("counts pending videos correctly", async () => {
    const video = await createVideo({ category: "ocean" });
    await updateVideo(video.id, { status: "pending" });

    const stats = await getVideoStats();
    expect(stats.pending).toBeGreaterThanOrEqual(1);
  });
});

describe("Analytics overview", () => {
  it("returns aggregate analytics with all fields", async () => {
    const overview = await getAnalyticsOverview();
    expect(overview).toHaveProperty("total_views");
    expect(overview).toHaveProperty("total_subscribers");
    expect(overview).toHaveProperty("videos_this_week");
    expect(overview).toHaveProperty("average_ctr");
    expect(typeof overview.total_views).toBe("number");
    expect(typeof overview.videos_this_week).toBe("number");
    expect(typeof overview.average_ctr).toBe("number");
  });

  it("returns total_subscribers as an object", async () => {
    const overview = await getAnalyticsOverview();
    expect(typeof overview.total_subscribers).toBe("object");
  });
});
