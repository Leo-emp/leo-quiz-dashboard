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
      data.platform || "both",
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
    "rounds_count", "platform", "scheduled_at", "reviewed_at", "uploaded_at",
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
            updated_at = ?
          WHERE id = 1`,
    args: [
      data.auto_enabled !== undefined ? (data.auto_enabled ? 1 : 0) : null,
      data.daily_hour_utc ?? null,
      data.daily_minute_utc ?? null,
      data.weekly_day ?? null,
      data.weekly_hour_utc ?? null,
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
    platform: (row.platform as Video["platform"]) || "both",
    scheduled_at: row.scheduled_at as string | null,
    created_at: row.created_at as string,
    reviewed_at: row.reviewed_at as string | null,
    uploaded_at: row.uploaded_at as string | null,
  };
}
