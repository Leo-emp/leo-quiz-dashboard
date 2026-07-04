// ─────────────────────────────────────────────────────────────
//  GitHub Actions API helpers.
//  Triggers pipeline workflows via workflow_dispatch and polls
//  run status for the dashboard's progress indicator.
//
//  Uses the GitHub REST API:
//    POST /repos/{owner}/{repo}/actions/workflows/{id}/dispatches
//    GET  /repos/{owner}/{repo}/actions/runs/{id}
// ─────────────────────────────────────────────────────────────

// -- GitHub API base URL --
const GITHUB_API = "https://api.github.com";

// -- Repo coordinates from env vars --
function getRepoInfo() {
  return {
    owner: process.env.GITHUB_REPO_OWNER || "Leo-emp",
    repo: process.env.GITHUB_REPO_NAME || "leo-quiz-pipeline",
    token: process.env.GITHUB_TOKEN || "",
  };
}

// -- Common headers for GitHub API calls --
function getHeaders() {
  const { token } = getRepoInfo();
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };
}

export async function triggerWorkflow(
  videoId: string,
  category: string,
  rounds: number
): Promise<number | null> {
  // Triggers the daily.yml workflow via workflow_dispatch.
  // Passes video_id, category, and rounds as inputs so the
  // pipeline knows which dashboard record to callback to.
  // Returns the workflow run ID (or null on failure).
  const { owner, repo } = getRepoInfo();

  // Step 1: Dispatch the workflow
  const dispatchRes = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/actions/workflows/daily.yml/dispatches`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        ref: "main",
        inputs: {
          video_id: videoId,
          category,
          rounds: String(rounds),
        },
      }),
    }
  );

  if (!dispatchRes.ok) {
    console.error("[GITHUB] Workflow dispatch failed:", dispatchRes.status);
    return null;
  }

  // Step 2: Wait a moment, then find the newly created run
  // GitHub doesn't return the run ID from dispatch — we poll for it
  await new Promise((r) => setTimeout(r, 3000));

  const runsRes = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/actions/workflows/daily.yml/runs?per_page=1`,
    { headers: getHeaders() }
  );

  if (!runsRes.ok) return null;

  const runsData = await runsRes.json();
  const latestRun = runsData.workflow_runs?.[0];

  return latestRun?.id || null;
}

export async function getWorkflowRunStatus(
  runId: number
): Promise<{ status: string; conclusion: string | null }> {
  // Polls a workflow run to check its current status.
  // Returns { status: "queued"|"in_progress"|"completed", conclusion: "success"|"failure"|null }
  const { owner, repo } = getRepoInfo();

  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/actions/runs/${runId}`,
    { headers: getHeaders() }
  );

  if (!res.ok) {
    return { status: "unknown", conclusion: null };
  }

  const data = await res.json();
  return {
    status: data.status || "unknown",
    conclusion: data.conclusion || null,
  };
}

export async function triggerUploadWorkflow(
  videoId: string,
  videoBlobUrl: string,
  metadata: { title: string; description: string; tags: string[] },
  platform: string
): Promise<number | null> {
  // Triggers the upload.yml workflow to post a video to YouTube/TikTok.
  // Called after approval or when a scheduled post is due.
  const { owner, repo } = getRepoInfo();

  const dispatchRes = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/actions/workflows/upload.yml/dispatches`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        ref: "main",
        inputs: {
          video_id: videoId,
          video_blob_url: videoBlobUrl,
          metadata_json: JSON.stringify(metadata),
          platform,
        },
      }),
    }
  );

  if (!dispatchRes.ok) {
    console.error("[GITHUB] Upload workflow dispatch failed:", dispatchRes.status);
    return null;
  }

  // Find the run ID
  await new Promise((r) => setTimeout(r, 3000));

  const runsRes = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/actions/workflows/upload.yml/runs?per_page=1`,
    { headers: getHeaders() }
  );

  if (!runsRes.ok) return null;
  const runsData = await runsRes.json();
  return runsData.workflow_runs?.[0]?.id || null;
}
