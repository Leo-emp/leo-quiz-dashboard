"use client";

// ─────────────────────────────────────────────────────────────
//  Approval Queue page — lists all pending videos for review.
//  Each video card shows player, metadata editor, and action buttons.
//  Admin can approve (post now or schedule), reject, or edit metadata.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { CheckSquare, RefreshCw } from "lucide-react";
import VideoCard from "@/components/video-card";
import type { Video } from "@/lib/types";

export default function QueuePage() {
  // -- Video list and loading state --
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  // -- Fetch pending videos --
  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/videos?status=pending&limit=50");
      const data = await res.json();
      setVideos(data.videos || []);
    } catch (err) {
      console.error("Failed to fetch queue:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => { fetchPending(); }, [fetchPending]);

  // -- Handle approve — post immediately or schedule for later --
  const handleApprove = async (videoId: string, scheduledAt?: string) => {
    await fetch(`/api/videos/${videoId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduled_at: scheduledAt }),
    });
    // If approved for immediate posting, trigger the upload workflow
    if (!scheduledAt) {
      await fetch(`/api/videos/${videoId}/upload`, { method: "POST" });
    }
    // Remove from queue (optimistic)
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
  };

  // -- Handle reject --
  const handleReject = async (videoId: string) => {
    await fetch(`/api/videos/${videoId}/reject`, { method: "POST" });
    // Remove from queue (optimistic)
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
  };

  // -- Handle metadata update (auto-saved via PATCH) --
  const handleUpdate = async (videoId: string, updates: Partial<Video>) => {
    await fetch(`/api/videos/${videoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  };

  return (
    <div className="space-y-6">
      {/* Page header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-amber-400" />
            Approval Queue
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {videos.length} video{videos.length !== 1 ? "s" : ""} awaiting review
          </p>
        </div>
        {/* Refresh button */}
        <button
          onClick={fetchPending}
          className="flex items-center gap-2 px-4 py-2 rounded-xl
                     bg-white/5 text-gray-400 hover:text-white hover:bg-white/10
                     transition-colors text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Video cards — each card has player, metadata editor, and action buttons */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading queue...</div>
      ) : videos.length === 0 ? (
        // Empty state
        <div className="glass-card p-12 text-center">
          <CheckSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No videos pending approval</p>
          <p className="text-gray-500 text-sm mt-1">
            Generate a new video to get started
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onApprove={handleApprove}
              onReject={handleReject}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
