-- ─────────────────────────────────────────────────────────────
--  LeoQuiz Dashboard database schema (Turso/SQLite).
--  Three tables: videos, schedule_config, activity_log.
--  Run this once to initialize the database.
-- ─────────────────────────────────────────────────────────────

-- Videos table — one row per generated quiz video
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'generating',
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  title TEXT,
  description TEXT,
  tags TEXT,
  hashtags TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  metadata_json TEXT,
  github_run_id TEXT,
  rounds_count INTEGER NOT NULL DEFAULT 5,
  platform TEXT NOT NULL DEFAULT 'both',
  scheduled_at TEXT,
  created_at TEXT NOT NULL,
  reviewed_at TEXT,
  uploaded_at TEXT
);

-- Index for filtering by status (approval queue, history)
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);

-- Index for filtering by category
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);

-- Index for cron job: find scheduled videos that are due
CREATE INDEX IF NOT EXISTS idx_videos_scheduled ON videos(status, scheduled_at);

-- Schedule config — singleton row (id=1 always)
CREATE TABLE IF NOT EXISTS schedule_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  auto_enabled INTEGER NOT NULL DEFAULT 0,
  daily_hour_utc INTEGER NOT NULL DEFAULT 6,
  daily_minute_utc INTEGER NOT NULL DEFAULT 0,
  weekly_day INTEGER NOT NULL DEFAULT 6,
  weekly_hour_utc INTEGER NOT NULL DEFAULT 8,
  updated_at TEXT
);

-- Seed the schedule config singleton
INSERT OR IGNORE INTO schedule_config (id) VALUES (1);

-- Activity log — chronological event history
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  video_id TEXT,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Index for recent activity queries (sorted by time)
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);
