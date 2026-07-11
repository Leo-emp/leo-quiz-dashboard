// ─────────────────────────────────────────────────────────────
//  ADMIN FAILURE NOTIFICATION — notify-admin.ts
//  ─────────────────────────────────────────────────────────────
//  # Sends structured failure alerts when cron jobs crash.
//  # Two notification channels:
//  #   1. Always: JSON log to console (visible in Vercel logs)
//  #   2. Optional: POST to ALERT_WEBHOOK_URL (Slack/Discord)
//  #
//  # This module NEVER throws — alerting failures are logged
//  # but can never crash the cron route that called us.
//  #
//  # Usage:
//  #   import { notifyAdmin } from "@/lib/notify-admin";
//  #   await notifyAdmin("Check Scheduled", error, { videoId: "abc" });
//  #
//  # Environment variables:
//  #   ALERT_WEBHOOK_URL — Slack/Discord webhook URL (optional)
//  #     Without this, only console logging is active.
// ─────────────────────────────────────────────────────────────

// # Sends a failure alert when a cron job fails.
// # cronName: human-readable name like "Check Scheduled" or "Pull Analytics"
// # error: the caught exception (Error or unknown)
// # details: optional context object for debugging
export async function notifyAdmin(
  cronName: string,
  error: unknown,
  details?: Record<string, unknown>
): Promise<void> {
  // # Extract error message — handle both Error instances and raw strings
  const errorMessage =
    error instanceof Error ? error.message : String(error);
  const timestamp = new Date().toISOString();

  // # ── Channel 1: Structured console log ──────────────────────
  // # Always fires — visible in Vercel runtime logs
  // # Filter by "CRON_FAILURE" level to find all cron errors
  console.error(
    JSON.stringify({
      level: "CRON_FAILURE",
      cron: cronName,
      error: errorMessage,
      timestamp,
      ...(details || {}),
    })
  );

  // # ── Channel 2: Webhook (Slack/Discord) ─────────────────────
  // # Only fires if ALERT_WEBHOOK_URL is set in env vars
  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // # Slack-compatible message format (also works with Discord)
        text: [
          `*Leo Quiz Cron Failure*`,
          `*Cron:* ${cronName}`,
          `*Error:* ${errorMessage}`,
          `*Time:* ${timestamp}`,
          details ? `*Details:* ${JSON.stringify(details)}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        cron: cronName,
        error: errorMessage,
        timestamp,
        details: details || {},
      }),
    });
  } catch (alertError) {
    // # Never let webhook failures crash the cron route
    console.error("[ALERT] Webhook send failed:", alertError);
  }
}
