// ─────────────────────────────────────────────────────────────
//  Core TypeScript types for LeoQuiz Dashboard.
//  Every module imports from here — this is the single source
//  of truth for data shapes across the entire app.
// ─────────────────────────────────────────────────────────────

// -- Video status lifecycle --
// generating → pending → approved → scheduled → uploaded
// Also: rejected (from pending), failed (from generating or uploading)
export type VideoStatus =
  | "generating"
  | "pending"
  | "approved"
  | "scheduled"
  | "uploaded"
  | "rejected"
  | "failed";

// -- Quiz categories matching the pipeline's config.py --
export type Category =
  | "animals"
  | "dinosaurs"
  | "space"
  | "vehicles"
  | "fruits"
  | "flags";

// -- How the video was triggered --
export type TriggerType = "manual" | "automated";

// -- Target posting platform --
export type Platform = "youtube" | "tiktok" | "both";

// -- Main video record stored in Turso --
export interface Video {
  // ULID primary key
  id: string;
  // Quiz category (animals, dinosaurs, etc.)
  category: Category;
  // Current status in the lifecycle
  status: VideoStatus;
  // How this video was triggered
  trigger_type: TriggerType;
  // Auto-generated title (editable by admin)
  title: string | null;
  // Auto-generated description (editable by admin)
  description: string | null;
  // JSON array of SEO tags
  tags: string | null;
  // JSON array of social media hashtags
  hashtags: string | null;
  // Vercel Blob URL of the rendered video
  video_url: string | null;
  // Vercel Blob URL of the thumbnail image
  thumbnail_url: string | null;
  // Full quiz pack JSON (rounds, answers, facts, prompts)
  metadata_json: string | null;
  // GitHub Actions run ID for status polling
  github_run_id: string | null;
  // Number of quiz rounds in this video
  rounds_count: number;
  // Target posting platform
  platform: Platform;
  // ISO timestamp for scheduled posting (null = not scheduled)
  scheduled_at: string | null;
  // ISO timestamp when the video record was created
  created_at: string;
  // ISO timestamp when admin approved/rejected (null = not reviewed)
  reviewed_at: string | null;
  // ISO timestamp when posted to platform (null = not uploaded)
  uploaded_at: string | null;
}

// -- Filters for the video list API --
export interface VideoFilters {
  // Filter by status (optional)
  status?: VideoStatus;
  // Filter by category (optional)
  category?: Category;
  // Filter by trigger type (optional)
  trigger_type?: TriggerType;
  // Search title substring (optional)
  search?: string;
  // Pagination offset (default 0)
  offset?: number;
  // Pagination limit (default 20)
  limit?: number;
}

// -- Schedule configuration (single row in DB) --
export interface ScheduleConfig {
  // Always 1 — singleton row
  id: number;
  // Whether auto-generation is enabled
  auto_enabled: boolean;
  // Hour (0-23 UTC) for daily generation
  daily_hour_utc: number;
  // Minute (0-59 UTC) for daily generation
  daily_minute_utc: number;
  // Day of week for weekly long-form compilation (0=Mon, 6=Sun)
  weekly_day: number;
  // Hour (0-23 UTC) for weekly compilation
  weekly_hour_utc: number;
  // ISO timestamp of last config change
  updated_at: string | null;
}

// -- Activity log entry --
export interface ActivityLogEntry {
  // ULID primary key
  id: string;
  // Action type
  action: string;
  // FK to videos.id (null for system events)
  video_id: string | null;
  // Human-readable event description
  message: string;
  // ISO timestamp
  created_at: string;
}

// -- Dashboard stats for the overview page --
export interface DashboardStats {
  // Videos generated today
  today: number;
  // Videos generated this week
  week: number;
  // Total videos ever generated
  total: number;
  // Videos awaiting approval
  pending: number;
}

// -- YouTube OAuth token data stored in Vercel Blob --
export interface TokenData {
  // Long-lived token for getting fresh access tokens
  refresh_token: string;
  // Short-lived token for API calls (~1 hour)
  access_token: string;
  // Unix timestamp (seconds) when access_token expires
  expires_at: number;
  // Display name of the connected YouTube channel
  account_name: string;
}

// -- YouTube connection status --
export interface ConnectionStatus {
  // Whether tokens exist and are valid
  connected: boolean;
  // Channel name (shown in settings)
  account_name?: string;
  // True when refresh token was rejected — user needs to re-auth
  needs_reconnect?: boolean;
}
