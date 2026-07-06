"use client";

// ─────────────────────────────────────────────────────────────
//  Video card — displays a video in the approval queue.
//  Shows video player, 3 thumbnail variants with AI Pick badge,
//  platform metadata preview (read-only), and action buttons.
//  One-click approve → auto-posts to ALL connected platforms.
// ─────────────────────────────────────────────────────────────

import { useState } from "react";
import { Check, X, Calendar, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import type { Video } from "@/lib/types";
import StatusBadge from "./status-badge";
import CategoryBadge from "./category-badge";
import VideoPlayer from "./video-player";
import DateTimePicker from "./date-time-picker";

// -- Variant labels for the 3 thumbnail styles --
const VARIANT_LABELS: Record<string, string> = {
  a: "Split Reveal",
  b: "Giant Mystery",
  c: "Grid Challenge",
};

// -- Platform display config --
const PLATFORM_CONFIG: Record<string, { label: string; color: string }> = {
  youtube: { label: "YouTube", color: "text-red-400" },
  tiktok: { label: "TikTok", color: "text-pink-400" },
  instagram: { label: "Instagram", color: "text-purple-400" },
  facebook: { label: "Facebook", color: "text-blue-400" },
};

interface VideoCardProps {
  video: Video;
  onApprove: (videoId: string, scheduledAt?: string) => void;
  onReject: (videoId: string) => void;
  onUpdate: (videoId: string, updates: Partial<Video>) => void;
}

export default function VideoCard({ video, onApprove, onReject }: VideoCardProps) {
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [showMetadata, setShowMetadata] = useState(false);

  // Parse quiz rounds and thumbnail data from metadata JSON
  const metadataObj = video.metadata_json ? JSON.parse(video.metadata_json) : {};
  const rounds = metadataObj.rounds || [];
  const thumbnailUrls = metadataObj.thumbnail_urls || {};
  const selectedThumbnail = metadataObj.selected_thumbnail || "a";

  // Parse platform-specific metadata
  let platformMetadata: Record<string, Record<string, unknown>> = {};
  try {
    if (video.platform_metadata) {
      platformMetadata = JSON.parse(video.platform_metadata);
    }
  } catch {
    // ignore
  }

  const hasThumbnailVariants = thumbnailUrls.a || thumbnailUrls.b || thumbnailUrls.c;
  const hasPlatformMeta = Object.keys(platformMetadata).length > 0;

  return (
    <div className="glass-card p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* -- Left: Video player -- */}
        <div className="flex-shrink-0">
          <VideoPlayer url={video.video_url} poster={video.thumbnail_url} />
        </div>

        {/* -- Right: Content -- */}
        <div className="flex-1 space-y-4">
          {/* Status + category badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={video.status} />
            <CategoryBadge category={video.category} />
            {video.video_format && video.video_format !== "short" && (
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-xs font-medium">
                {video.video_format === "long" ? "Long-form" : "Mega Quiz"}
              </span>
            )}
            <span className="text-xs text-gray-500">
              {video.trigger_type === "automated" ? "Auto-generated" : "Manual"}
              {video.rounds_count ? ` · ${video.rounds_count} rounds` : ""}
            </span>
          </div>

          {/* Title */}
          {video.title && (
            <p className="text-white font-medium">{video.title}</p>
          )}

          {/* Quiz rounds summary */}
          {rounds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {rounds.slice(0, 10).map((r: { answer: string }, i: number) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md bg-white/5 text-xs text-gray-300"
                >
                  {r.answer}
                </span>
              ))}
              {rounds.length > 10 && (
                <span className="px-2 py-0.5 rounded-md bg-white/5 text-xs text-gray-500">
                  +{rounds.length - 10} more
                </span>
              )}
            </div>
          )}

          {/* -- Thumbnail variants preview -- */}
          {hasThumbnailVariants && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Thumbnail Variants</p>
              <div className="flex gap-3 flex-wrap">
                {(["a", "b", "c"] as const).map((variant) => {
                  const url = thumbnailUrls[variant];
                  if (!url) return null;
                  const isSelected = variant === selectedThumbnail;
                  return (
                    <div key={variant} className="relative">
                      <img
                        src={url}
                        alt={`Variant ${variant.toUpperCase()}`}
                        className={`w-28 h-auto rounded-lg border-2 transition-all
                          ${isSelected
                            ? "border-amber-400 shadow-lg shadow-amber-400/20"
                            : "border-white/10 opacity-60"
                          }`}
                      />
                      {/* AI Pick badge on the selected variant */}
                      {isSelected && (
                        <span className="absolute -top-2 -right-2 flex items-center gap-0.5
                                         px-1.5 py-0.5 rounded-full bg-amber-500 text-[10px]
                                         font-bold text-black">
                          <Sparkles className="w-2.5 h-2.5" />
                          AI Pick
                        </span>
                      )}
                      {/* Variant label */}
                      <p className="text-[10px] text-gray-500 mt-1 text-center">
                        {VARIANT_LABELS[variant] || variant.toUpperCase()}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* -- Platform metadata preview (collapsible) -- */}
          {hasPlatformMeta && (
            <div>
              <button
                onClick={() => setShowMetadata(!showMetadata)}
                className="flex items-center gap-1.5 text-xs text-gray-400
                           hover:text-gray-300 transition-colors"
              >
                {showMetadata ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                Platform Metadata Preview
              </button>

              {showMetadata && (
                <div className="mt-2 space-y-3">
                  {Object.entries(platformMetadata).map(([platform, rawMeta]) => {
                    const config = PLATFORM_CONFIG[platform];
                    if (!config || !rawMeta) return null;
                    const m = rawMeta as { title?: string; caption?: string; description?: string; hashtags?: string[] };
                    return (
                      <div key={platform} className="p-3 rounded-xl bg-white/5 border border-white/5">
                        <p className={`text-xs font-medium ${config.color} mb-1.5`}>
                          {config.label}
                        </p>
                        <div className="space-y-1 text-xs text-gray-400">
                          {m.title && (
                            <p><span className="text-gray-500">Title:</span> {m.title}</p>
                          )}
                          {m.caption && (
                            <p><span className="text-gray-500">Caption:</span> {m.caption}</p>
                          )}
                          {m.description && (
                            <p className="line-clamp-2">
                              <span className="text-gray-500">Description:</span> {m.description}
                            </p>
                          )}
                          {m.hashtags && m.hashtags.length > 0 && (
                            <p className="text-gray-500">
                              Hashtags: {m.hashtags.slice(0, 10).join(" ")}
                              {m.hashtags.length > 10 && ` +${m.hashtags.length - 10} more`}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Schedule picker */}
          {showScheduler && (
            <DateTimePicker
              value={scheduledAt}
              onChange={setScheduledAt}
              label="Schedule posting for"
            />
          )}

          {/* -- Action buttons -- */}
          <div className="flex flex-wrap gap-3 pt-2">
            {/* Approve & Post Now */}
            <button
              onClick={() => onApprove(video.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                         bg-emerald-500/20 text-emerald-400 border border-emerald-500/30
                         hover:bg-emerald-500/30 transition-colors text-sm font-medium"
            >
              <Check className="w-4 h-4" />
              Approve & Post to All
            </button>

            {/* Approve & Schedule */}
            <button
              onClick={() => {
                if (showScheduler && scheduledAt) {
                  onApprove(video.id, scheduledAt);
                } else {
                  setShowScheduler(true);
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                         bg-purple-500/20 text-purple-400 border border-purple-500/30
                         hover:bg-purple-500/30 transition-colors text-sm font-medium"
            >
              <Calendar className="w-4 h-4" />
              {showScheduler ? "Confirm Schedule" : "Schedule"}
            </button>

            {/* Reject */}
            <button
              onClick={() => onReject(video.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                         bg-rose-500/20 text-rose-400 border border-rose-500/30
                         hover:bg-rose-500/30 transition-colors text-sm font-medium"
            >
              <X className="w-4 h-4" />
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
