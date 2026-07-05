// ─────────────────────────────────────────────────────────────
//  Turso database client and query helpers.
//  All database access goes through this module — no raw SQL
//  in API routes. Uses @libsql/client for Turso (SQLite).
//
//  Exports one function per operation:
//    createVideo, getVideo, updateVideo, listVideos,
//    getScheduleConfig, updateScheduleConfig,
//    logActivity, getRecentActivity, getVideoStats
// ─────────────────────────────────────────────────────────────

import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import path from "path";
import { ulid } from "ulid";
import type {
  Video,
  VideoFilters,
  ScheduleConfig,
  ActivityLogEntry,
  DashboardStats,
  VideoAnalytics,
  ChannelAnalytics,
  ThumbnailTest,
  AnalyticsOverview,
} from "./types";

// -- Create the Turso client --
// Uses env vars set in Vercel (or .env locally)
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// -- Initialize schema on first import --
// Reads schema.sql and executes all statements.
// Safe to run multiple times because all statements use IF NOT EXISTS.
export async function initializeDatabase(): Promise<void> {
  // Read the schema file from the lib directory
  const schemaPath = path.join(process.cwd(), "lib", "schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");

  // Execute all SQL statements from the schema file
  // The schema uses IF NOT EXISTS clauses, so it's safe to run repeatedly
  await db.executeMultiple(schema);

  // Run migrations for new columns (SQLite ALTER TABLE)
  // Each ALTER TABLE will fail silently if the column already exists
  const migrations = [
    "ALTER TABLE videos ADD COLUMN youtube_url TEXT",
    "ALTER TABLE videos ADD COLUMN tiktok_url TEXT",
    "ALTER TABLE videos ADD COLUMN instagram_url TEXT",
    "ALTER TABLE videos ADD COLUMN facebook_url TEXT",
    "ALTER TABLE videos ADD COLUMN video_format TEXT DEFAULT 'short'",
    "ALTER TABLE videos ADD COLUMN platform_metadata TEXT",
    "ALTER TABLE schedule_config ADD COLUMN generate_longform INTEGER DEFAULT 1",
    "ALTER TABLE schedule_config ADD COLUMN mega_day INTEGER DEFAULT 6",
    "ALTER TABLE schedule_config ADD COLUMN mega_hour_utc INTEGER DEFAULT 10",
  ];
  for (const sql of migrations) {
    try { await db.execute(sql); } catch { /* column already exists */ }
  }
}

// ─── Video CRUD ──────────────────────────────────────────────

export async function createVideo(data: Partial<Video>): Promise<Video> {
  // Creates a new video record with a ULID and current timestamp.
  // Only category, trigger_type, and rounds_count are required —
  // everything else has defaults or is set later by the webhook.
  const id = ulid();
  const now = new Date().toISOString();

  await db.execute({
    sql: `INSERT INTO videos (id, category, status, trigger_type, rounds_count, platform, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      data.category || "animals",
      data.status || "generating",
      data.trigger_type || "manual",
      data.rounds_count || 5,
      data.platform || "all",
      now,
    ],
  });

  return getVideo(id) as Promise<Video>;
}

export async function getVideo(id: string): Promise<Video | null> {
  // Fetches a single video by its ULID
  const result = await db.execute({
    sql: "SELECT * FROM videos WHERE id = ?",
    args: [id],
  });

  if (result.rows.length === 0) return null;
  return rowToVideo(result.rows[0]);
}

export async function updateVideo(
  id: string,
  data: Partial<Video>
): Promise<Video> {
  // Updates specific fields on a video record.
  // Only updates fields that are provided (not undefined).
  const fields: string[] = [];
  // Typed to match libsql's InValue union (string | number | null | ...)
  // instead of `unknown[]`, so it satisfies db.execute()'s args type.
  const values: (string | number | null)[] = [];

  // Build SET clause dynamically from provided fields
  const updatable = [
    "status", "title", "description", "tags", "hashtags",
    "video_url", "thumbnail_url", "metadata_json", "github_run_id",
    "rounds_count", "platform", "video_format", "platform_metadata",
    "youtube_url", "tiktok_url", "instagram_url", "facebook_url",
    "scheduled_at", "reviewed_at", "uploaded_at",
  ] as const;

  for (const field of updatable) {
    if (data[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(data[field]);
    }
  }

  if (fields.length === 0) return getVideo(id) as Promise<Video>;

  values.push(id);
  await db.execute({
    sql: `UPDATE videos SET ${fields.join(", ")} WHERE id = ?`,
    args: values,
  });

  return getVideo(id) as Promise<Video>;
}

export async function listVideos(
  filters: VideoFilters = {}
): Promise<{ videos: Video[]; total: number }> {
  // Lists videos with optional filters, search, and pagination.
  // Returns both the page of results and the total count.
  const conditions: string[] = [];
  // Typed to match libsql's InValue union (string | number | null | ...)
  // instead of `unknown[]`, so it satisfies db.execute()'s args type.
  const args: (string | number | null)[] = [];

  // Apply optional filters
  if (filters.status) {
    conditions.push("status = ?");
    args.push(filters.status);
  }
  if (filters.category) {
    conditions.push("category = ?");
    args.push(filters.category);
  }
  if (filters.trigger_type) {
    conditions.push("trigger_type = ?");
    args.push(filters.trigger_type);
  }
  if (filters.search) {
    conditions.push("title LIKE ?");
    args.push(`%${filters.search}%`);
  }

  const where = conditions.length > 0
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  // Get total count for pagination
  const countResult = await db.execute({
    sql: `SELECT COUNT(*) as count FROM videos ${where}`,
    args,
  });
  const total = Number(countResult.rows[0].count);

  // Get paginated results
  const limit = filters.limit || 20;
  const offset = filters.offset || 0;

  const result = await db.execute({
    sql: `SELECT * FROM videos ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    args: [...args, limit, offset],
  });

  return {
    videos: result.rows.map(rowToVideo),
    total,
  };
}

// ─── Schedule Config ─────────────────────────────────────────

export async function getScheduleConfig(): Promise<ScheduleConfig> {
  // Reads the singleton schedule config row (id=1)
  const result = await db.execute("SELECT * FROM schedule_config WHERE id = 1");

  if (result.rows.length === 0) {
    // Should never happen — schema seeds this row
    return {
      id: 1,
      auto_enabled: false,
      daily_hour_utc: 6,
      daily_minute_utc: 0,
      weekly_day: 6,
      weekly_hour_utc: 8,
      generate_longform: true,
      mega_day: 6,
      mega_hour_utc: 10,
      updated_at: null,
    };
  }

  const row = result.rows[0];
  return {
    id: 1,
    auto_enabled: row.auto_enabled === 1,
    daily_hour_utc: Number(row.daily_hour_utc),
    daily_minute_utc: Number(row.daily_minute_utc),
    weekly_day: Number(row.weekly_day),
    weekly_hour_utc: Number(row.weekly_hour_utc),
    generate_longform: row.generate_longform === 1,
    mega_day: Number(row.mega_day ?? 6),
    mega_hour_utc: Number(row.mega_hour_utc ?? 10),
    updated_at: row.updated_at as string | null,
  };
}

export async function updateScheduleConfig(
  data: Partial<ScheduleConfig>
): Promise<ScheduleConfig> {
  // Updates the singleton schedule config row
  const now = new Date().toISOString();

  await db.execute({
    sql: `UPDATE schedule_config SET
            auto_enabled = COALESCE(?, auto_enabled),
            daily_hour_utc = COALESCE(?, daily_hour_utc),
            daily_minute_utc = COALESCE(?, daily_minute_utc),
            weekly_day = COALESCE(?, weekly_day),
            weekly_hour_utc = COALESCE(?, weekly_hour_utc),
            generate_longform = COALESCE(?, generate_longform),
            mega_day = COALESCE(?, mega_day),
            mega_hour_utc = COALESCE(?, mega_hour_utc),
            updated_at = ?
          WHERE id = 1`,
    args: [
      data.auto_enabled !== undefined ? (data.auto_enabled ? 1 : 0) : null,
      data.daily_hour_utc ?? null,
      data.daily_minute_utc ?? null,
      data.weekly_day ?? null,
      data.weekly_hour_utc ?? null,
      data.generate_longform !== undefined ? (data.generate_longform ? 1 : 0) : null,
      data.mega_day ?? null,
      data.mega_hour_utc ?? null,
      now,
    ],
  });

  return getScheduleConfig();
}

// ─── Activity Log ────────────────────────────────────────────

export async function logActivity(
  action: string,
  videoId: string | null,
  message: string
): Promise<void> {
  // Records an activity event (e.g., "Video generated", "Video approved")
  const id = ulid();
  const now = new Date().toISOString();

  await db.execute({
    sql: `INSERT INTO activity_log (id, action, video_id, message, created_at)
          VALUES (?, ?, ?, ?, ?)`,
    args: [id, action, videoId, message, now],
  });
}

export async function getRecentActivity(
  limit: number = 20
): Promise<ActivityLogEntry[]> {
  // Fetches the most recent activity log entries
  const result = await db.execute({
    sql: "SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?",
    args: [limit],
  });

  return result.rows.map((row) => ({
    id: row.id as string,
    action: row.action as string,
    video_id: row.video_id as string | null,
    message: row.message as string,
    created_at: row.created_at as string,
  }));
}

// ─── Dashboard Stats ─────────────────────────────────────────

export async function getVideoStats(): Promise<DashboardStats> {
  // Computes dashboard overview stats in a single query batch.
  // Returns today's count, this week's count, total, and pending.
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  // Monday of current week at 00:00
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset).toISOString();

  const [todayResult, weekResult, totalResult, pendingResult] = await Promise.all([
    db.execute({ sql: "SELECT COUNT(*) as c FROM videos WHERE created_at >= ?", args: [todayStart] }),
    db.execute({ sql: "SELECT COUNT(*) as c FROM videos WHERE created_at >= ?", args: [weekStart] }),
    db.execute({ sql: "SELECT COUNT(*) as c FROM videos", args: [] }),
    db.execute({ sql: "SELECT COUNT(*) as c FROM videos WHERE status = 'pending'", args: [] }),
  ]);

  return {
    today: Number(todayResult.rows[0].c),
    week: Number(weekResult.rows[0].c),
    total: Number(totalResult.rows[0].c),
    pending: Number(pendingResult.rows[0].c),
  };
}

// ─── Row mapper ──────────────────────────────────────────────

function rowToVideo(row: Record<string, unknown>): Video {
  // Converts a raw Turso row to a typed Video object
  return {
    id: row.id as string,
    category: row.category as Video["category"],
    status: row.status as Video["status"],
    trigger_type: row.trigger_type as Video["trigger_type"],
    title: row.title as string | null,
    description: row.description as string | null,
    tags: row.tags as string | null,
    hashtags: row.hashtags as string | null,
    video_url: row.video_url as string | null,
    thumbnail_url: row.thumbnail_url as string | null,
    metadata_json: row.metadata_json as string | null,
    github_run_id: row.github_run_id as string | null,
    rounds_count: Number(row.rounds_count),
    platform: (row.platform as Video["platform"]) || "all",
    video_format: (row.video_format as Video["video_format"]) || "short",
    youtube_url: row.youtube_url as string | null,
    tiktok_url: row.tiktok_url as string | null,
    instagram_url: row.instagram_url as string | null,
    facebook_url: row.facebook_url as string | null,
    platform_metadata: row.platform_metadata as string | null,
    scheduled_at: row.scheduled_at as string | null,
    created_at: row.created_at as string,
    reviewed_at: row.reviewed_at as string | null,
    uploaded_at: row.uploaded_at as string | null,
  };
}

// ─── Video Analytics ────────────────────────────────────────

export async function saveVideoAnalytics(data: Partial<VideoAnalytics>): Promise<void> {
  // Upserts a video analytics record (one per video per platform per fetch)
  const id = data.id || ulid();
  const now = new Date().toISOString();

  await db.execute({
    sql: `INSERT OR REPLACE INTO video_analytics
          (id, video_id, platform, platform_video_id, views, likes, comments,
           shares, saves, watch_time_minutes, impressions, ctr, fetched_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, data.video_id || "", data.platform || "",
      data.platform_video_id || null,
      data.views ?? 0, data.likes ?? 0, data.comments ?? 0,
      data.shares ?? 0, data.saves ?? 0, data.watch_time_minutes ?? 0,
      data.impressions ?? 0, data.ctr ?? 0, now,
    ],
  });
}

export async function getVideoAnalytics(videoId: string): Promise<VideoAnalytics[]> {
  // Fetches all analytics records for a specific video
  const result = await db.execute({
    sql: `SELECT * FROM video_analytics WHERE video_id = ? ORDER BY fetched_at DESC`,
    args: [videoId],
  });

  return result.rows.map((row) => ({
    id: row.id as string,
    video_id: row.video_id as string,
    platform: row.platform as string,
    platform_video_id: row.platform_video_id as string | null,
    views: Number(row.views),
    likes: Number(row.likes),
    comments: Number(row.comments),
    shares: Number(row.shares),
    saves: Number(row.saves),
    watch_time_minutes: Number(row.watch_time_minutes),
    impressions: Number(row.impressions),
    ctr: Number(row.ctr),
    fetched_at: row.fetched_at as string,
  }));
}

export async function getChannelAnalytics(platform: string, days: number = 30): Promise<ChannelAnalytics[]> {
  // Fetches channel-level analytics for a platform over the last N days
  const cutoff = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];

  const result = await db.execute({
    sql: `SELECT * FROM channel_analytics WHERE platform = ? AND date >= ? ORDER BY date ASC`,
    args: [platform, cutoff],
  });

  return result.rows.map((row) => ({
    id: row.id as string,
    platform: row.platform as string,
    date: row.date as string,
    subscribers: Number(row.subscribers),
    total_views: Number(row.total_views),
    new_videos: Number(row.new_videos),
    fetched_at: row.fetched_at as string,
  }));
}

// ─── Thumbnail Tests ────────────────────────────────────────

export async function saveThumbnailTest(data: Partial<ThumbnailTest>): Promise<void> {
  // Creates or updates a thumbnail A/B test record
  const id = data.id || ulid();

  await db.execute({
    sql: `INSERT OR REPLACE INTO thumbnail_tests
          (id, video_id, variant, platform, uploaded_at, impressions, clicks, ctr, checked_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, data.video_id || "", data.variant || "a", data.platform || "youtube",
      data.uploaded_at || null, data.impressions ?? 0, data.clicks ?? 0,
      data.ctr ?? 0, data.checked_at || null,
    ],
  });
}

export async function getThumbnailTests(videoId: string): Promise<ThumbnailTest[]> {
  // Fetches all thumbnail test records for a video
  const result = await db.execute({
    sql: `SELECT * FROM thumbnail_tests WHERE video_id = ? ORDER BY variant`,
    args: [videoId],
  });

  return result.rows.map((row) => ({
    id: row.id as string,
    video_id: row.video_id as string,
    variant: row.variant as string,
    platform: row.platform as string,
    uploaded_at: row.uploaded_at as string | null,
    impressions: Number(row.impressions),
    clicks: Number(row.clicks),
    ctr: Number(row.ctr),
    checked_at: row.checked_at as string | null,
  }));
}

// ─── Analytics Overview ─────────────────────────────────────

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  // Computes aggregate analytics for the dashboard overview cards
  const [viewsResult, weekResult, ctrResult] = await Promise.all([
    db.execute("SELECT SUM(views) as total FROM video_analytics"),
    db.execute({
      sql: "SELECT COUNT(DISTINCT video_id) as c FROM video_analytics WHERE fetched_at >= ?",
      args: [new Date(Date.now() - 7 * 86400000).toISOString()],
    }),
    db.execute("SELECT AVG(ctr) as avg_ctr FROM video_analytics WHERE impressions > 0"),
  ]);

  // Subscribers per platform from latest channel_analytics
  const subsResult = await db.execute(
    `SELECT platform, subscribers FROM channel_analytics
     WHERE (platform, date) IN (
       SELECT platform, MAX(date) FROM channel_analytics GROUP BY platform
     )`
  );

  const total_subscribers: Record<string, number> = {};
  for (const row of subsResult.rows) {
    total_subscribers[row.platform as string] = Number(row.subscribers);
  }

  return {
    total_views: Number(viewsResult.rows[0]?.total ?? 0),
    total_subscribers,
    videos_this_week: Number(weekResult.rows[0]?.c ?? 0),
    average_ctr: Number(ctrResult.rows[0]?.avg_ctr ?? 0),
  };
}

export async function getTopVideos(limit: number = 10, platform?: string): Promise<(Video & { total_views: number })[]> {
  // Fetches top-performing videos by total views
  const platformFilter = platform ? "AND va.platform = ?" : "";
  const args: (string | number)[] = platform ? [platform, limit] : [limit];

  const result = await db.execute({
    sql: `SELECT v.*, COALESCE(SUM(va.views), 0) as total_views
          FROM videos v
          LEFT JOIN video_analytics va ON v.id = va.video_id ${platformFilter}
          GROUP BY v.id
          ORDER BY total_views DESC
          LIMIT ?`,
    args,
  });

  return result.rows.map((row) => ({
    ...rowToVideo(row),
    total_views: Number(row.total_views),
  }));
}
