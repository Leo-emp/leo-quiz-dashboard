// ─────────────────────────────────────────────────────────────
//  POST /api/cron/pull-analytics
//  Vercel Cron job — runs daily at 06:00 UTC.
//  Pulls video stats and channel stats from all connected
//  platforms and saves them to the analytics tables.
//  Protected by CRON_SECRET header.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { listVideos, saveVideoAnalytics, saveChannelAnalytics } from "@/lib/db";
import { getToken, getConnectionStatus } from "@/lib/tokens";

export async function POST(request: Request) {
  // -- Verify cron secret --
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // -- Get connected platforms --
  const connectionStatus = await getConnectionStatus();
  const connectedPlatforms = Object.entries(connectionStatus)
    .filter(([, status]) => status.connected)
    .map(([platform]) => platform);

  if (connectedPlatforms.length === 0) {
    return NextResponse.json({ message: "No platforms connected", pulled: 0 });
  }

  // -- Get recently uploaded videos (last 30 days) --
  const { videos } = await listVideos({ limit: 100 });
  const recentVideos = videos.filter((v) => {
    if (!v.created_at) return false;
    const age = Date.now() - new Date(v.created_at).getTime();
    return age < 30 * 86400000;
  });

  let pulled = 0;

  for (const platform of connectedPlatforms) {
    const token = await getToken(platform);
    if (!token) continue;

    try {
      // -- Pull video-level stats --
      for (const video of recentVideos) {
        const stats = await fetchVideoStats(platform, video, token.access_token);
        if (stats) {
          await saveVideoAnalytics({
            video_id: video.id,
            platform,
            views: stats.views,
            likes: stats.likes,
            comments: stats.comments,
            shares: stats.shares,
            saves: stats.saves,
            impressions: stats.impressions,
            ctr: stats.impressions > 0 ? stats.views / stats.impressions : 0,
          });
          pulled++;
        }
      }

      // -- Pull channel-level stats --
      const channelStats = await fetchChannelStats(platform, token.access_token);
      if (channelStats) {
        const today = new Date().toISOString().split("T")[0];
        await saveChannelAnalytics({
          platform,
          date: today,
          subscribers: channelStats.subscribers,
          total_views: channelStats.total_views,
          new_videos: recentVideos.length,
        });
      }
    } catch (err) {
      console.error(`[ANALYTICS] Error pulling ${platform}:`, err);
    }
  }

  return NextResponse.json({
    pulled,
    platforms: connectedPlatforms,
    videos_checked: recentVideos.length,
    timestamp: new Date().toISOString(),
  });
}

// ─── Platform-specific stats fetchers ─────────────────────────

type VideoStats = {
  views: number; likes: number; comments: number;
  shares: number; saves: number; impressions: number;
};

type ChannelStats = { subscribers: number; total_views: number };

async function fetchVideoStats(
  platform: string,
  video: { id: string; youtube_url?: string | null; tiktok_url?: string | null; instagram_url?: string | null; facebook_url?: string | null },
  accessToken: string
): Promise<VideoStats | null> {
  try {
    if (platform === "youtube") return await fetchYouTubeVideoStats(video.youtube_url, accessToken);
    if (platform === "instagram") return await fetchInstagramVideoStats(video.instagram_url, accessToken);
    if (platform === "facebook") return await fetchFacebookVideoStats(video.facebook_url, accessToken);
    // TikTok Content Posting API doesn't provide per-video analytics
  } catch (err) {
    console.error(`[ANALYTICS] ${platform} video stats error:`, err);
  }
  return null;
}

async function fetchYouTubeVideoStats(url: string | null | undefined, accessToken: string): Promise<VideoStats | null> {
  if (!url) return null;
  const match = url.match(/(?:v=|\/)([\w-]{11})/);
  if (!match) return null;

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${match[1]}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;

  const data = await res.json();
  const stats = data.items?.[0]?.statistics;
  if (!stats) return null;

  return {
    views: Number(stats.viewCount || 0),
    likes: Number(stats.likeCount || 0),
    comments: Number(stats.commentCount || 0),
    shares: 0,
    saves: 0,
    impressions: 0,
  };
}

async function fetchInstagramVideoStats(url: string | null | undefined, accessToken: string): Promise<VideoStats | null> {
  if (!url) return null;
  const match = url.match(/reel\/(\d+)/);
  if (!match) return null;

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${match[1]}/insights?metric=plays,likes,comments,shares,saved,reach&access_token=${accessToken}`
  );
  if (!res.ok) return null;

  const data = await res.json();
  const metrics: Record<string, number> = {};
  for (const m of data.data || []) {
    metrics[m.name] = m.values?.[0]?.value || 0;
  }

  return {
    views: metrics.plays || 0,
    likes: metrics.likes || 0,
    comments: metrics.comments || 0,
    shares: metrics.shares || 0,
    saves: metrics.saved || 0,
    impressions: metrics.reach || 0,
  };
}

async function fetchFacebookVideoStats(url: string | null | undefined, accessToken: string): Promise<VideoStats | null> {
  if (!url) return null;
  const match = url.match(/reel\/(\d+)/);
  if (!match) return null;

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${match[1]}/video_insights?metric=total_video_views,total_video_reactions_by_type_total,total_video_comments,total_video_shares&access_token=${accessToken}`
  );
  if (!res.ok) return null;

  const data = await res.json();
  const metrics: Record<string, number> = {};
  for (const m of data.data || []) {
    metrics[m.name] = typeof m.values?.[0]?.value === "number" ? m.values[0].value : 0;
  }

  return {
    views: metrics.total_video_views || 0,
    likes: metrics.total_video_reactions_by_type_total || 0,
    comments: metrics.total_video_comments || 0,
    shares: metrics.total_video_shares || 0,
    saves: 0,
    impressions: 0,
  };
}

async function fetchChannelStats(platform: string, accessToken: string): Promise<ChannelStats | null> {
  try {
    if (platform === "youtube") {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const stats = data.items?.[0]?.statistics;
      if (!stats) return null;
      return {
        subscribers: Number(stats.subscriberCount || 0),
        total_views: Number(stats.viewCount || 0),
      };
    }
  } catch (err) {
    console.error(`[ANALYTICS] Channel stats error for ${platform}:`, err);
  }
  return null;
}
