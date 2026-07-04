"use client";

// ─────────────────────────────────────────────────────────────
//  Video card — displays a video in the approval queue.
//  Shows video player, thumbnail, metadata editor, and action buttons.
//  This is the primary interaction surface for reviewing videos.
// ─────────────────────────────────────────────────────────────

import { useState } from "react";
import { Check, X, Calendar, RefreshCw } from "lucide-react";
import type { Video } from "@/lib/types";
import StatusBadge from "./status-badge";
import CategoryBadge from "./category-badge";
import VideoPlayer from "./video-player";
import MetadataEditor from "./metadata-editor";
import DateTimePicker from "./date-time-picker";

interface VideoCardProps {
  // The video to display
  video: Video;
  // Callback when admin approves (optional scheduled_at)
  onApprove: (videoId: string, scheduledAt?: string) => void;
  // Callback when admin rejects
  onReject: (videoId: string) => void;
  // Callback when metadata changes (auto-saved)
  onUpdate: (videoId: string, updates: Partial<Video>) => void;
}

export default function VideoCard({ video, onApprove, onReject, onUpdate }: VideoCardProps) {
  // Local state for schedule picker
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");

  // Parse quiz rounds from metadata JSON
  const quizData = video.metadata_json ? JSON.parse(video.metadata_json) : null;
  const rounds = quizData?.rounds || [];

  return (
    <div className="glass-card p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* -- Left: Video player + thumbnail -- */}
        <div className="flex gap-4 flex-shrink-0">
          <VideoPlayer url={video.video_url} poster={video.thumbnail_url} />
          {/* Thumbnail preview */}
          {video.thumbnail_url && (
            <div className="hidden xl:block">
              <p className="text-xs text-gray-500 mb-1">Thumbnail</p>
              <img
                src={video.thumbnail_url}
                alt="Thumbnail"
                className="w-32 rounded-lg border border-white/10"
              />
            </div>
          )}
        </div>

        {/* -- Right: Metadata + actions -- */}
        <div className="flex-1 space-y-4">
          {/* Status + category badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={video.status} />
            <CategoryBadge category={video.category} />
            <span className="text-xs text-gray-500">
              {video.trigger_type === "automated" ? "Auto-generated" : "Manual"}
            </span>
          </div>

          {/* Quiz rounds summary */}
          {rounds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {rounds.map((r: { answer: string }, i: number) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md bg-white/5 text-xs text-gray-300"
                >
                  {r.answer}
                </span>
              ))}
            </div>
          )}

          {/* Metadata editor — editable title, description, tags, hashtags */}
          <MetadataEditor
            video={video}
            onChange={(updates) => onUpdate(video.id, updates)}
          />

          {/* Schedule picker (shown when "Approve & Schedule" is clicked) */}
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
              Approve & Post Now
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
              {showScheduler ? "Confirm Schedule" : "Approve & Schedule"}
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
