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

-- ─────────────────────────────────────────────────────────────
--  Pro Upgrade tables: analytics, thumbnail tests
-- ─────────────────────────────────────────────────────────────

-- Video analytics — per-video per-platform stats pulled from APIs
CREATE TABLE IF NOT EXISTS video_analytics (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  platform_video_id TEXT,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  watch_time_minutes REAL DEFAULT 0.0,
  impressions INTEGER DEFAULT 0,
  ctr REAL DEFAULT 0.0,
  fetched_at TEXT NOT NULL,
  FOREIGN KEY (video_id) REFERENCES videos(id)
);

-- Index for fetching analytics by video
CREATE INDEX IF NOT EXISTS idx_analytics_video ON video_analytics(video_id);

-- Index for fetching analytics by platform
CREATE INDEX IF NOT EXISTS idx_analytics_platform ON video_analytics(platform);

-- Channel analytics — daily channel-level stats per platform
CREATE TABLE IF NOT EXISTS channel_analytics (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  date TEXT NOT NULL,
  subscribers INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  new_videos INTEGER DEFAULT 0,
  fetched_at TEXT NOT NULL,
  UNIQUE(platform, date)
);

-- Thumbnail A/B test tracking
CREATE TABLE IF NOT EXISTS thumbnail_tests (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL,
  variant TEXT NOT NULL,
  platform TEXT NOT NULL,
  uploaded_at TEXT,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr REAL DEFAULT 0.0,
  checked_at TEXT,
  FOREIGN KEY (video_id) REFERENCES videos(id)
);

-- Index for thumbnail CTR queries by video
CREATE INDEX IF NOT EXISTS idx_thumbtests_video ON thumbnail_tests(video_id);
