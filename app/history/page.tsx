"use client";

// ─────────────────────────────────────────────────────────────
//  History page — all past videos with filters and search.
//  Filters: status, category, trigger type, title search.
//  Paginated with 20 videos per page.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { History as HistoryIcon, Search, ChevronLeft, ChevronRight } from "lucide-react";
import StatusBadge from "@/components/status-badge";
import CategoryBadge from "@/components/category-badge";
import type { Video } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

// -- 20 videos per page --
const PAGE_SIZE = 20;

export default function HistoryPage() {
  // -- Video list and loading state --
  const [videos, setVideos] = useState<Video[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // -- Filter state --
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [triggerFilter, setTriggerFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  // -- Fetch videos with current filters --
  const fetchVideos = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    // Only add filter params when not "all"
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    if (triggerFilter !== "all") params.set("trigger_type", triggerFilter);
    if (search) params.set("search", search);
    // Pagination
    params.set("offset", String(page * PAGE_SIZE));
    params.set("limit", String(PAGE_SIZE));

    try {
      const res = await fetch(`/api/videos?${params}`);
      const data = await res.json();
      setVideos(data.videos || []);
      setTotal(data.total || 0);
    } catch {
      console.error("Failed to fetch history");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, triggerFilter, search, page]);

  // Re-fetch when filters or page change
  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  // Total pages for pagination
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <HistoryIcon className="w-6 h-6 text-purple-400" />
          History
        </h1>
        <p className="text-gray-400 text-sm mt-1">{total} total videos</p>
      </div>

      {/* Filters bar — dropdowns + search input */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10
                     text-white text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="scheduled">Scheduled</option>
          <option value="uploaded">Uploaded</option>
          <option value="rejected">Rejected</option>
          <option value="failed">Failed</option>
        </select>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10
                     text-white text-sm"
        >
          <option value="all">All Categories</option>
          <option value="animals">Animals</option>
          <option value="dinosaurs">Dinosaurs</option>
          <option value="space">Space</option>
          <option value="vehicles">Vehicles</option>
          <option value="fruits">Fruits</option>
          <option value="flags">Flags</option>
        </select>

        {/* Trigger filter */}
        <select
          value={triggerFilter}
          onChange={(e) => { setTriggerFilter(e.target.value); setPage(0); }}
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10
                     text-white text-sm"
        >
          <option value="all">All Triggers</option>
          <option value="manual">Manual</option>
          <option value="automated">Automated</option>
        </select>

        {/* Search input */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by title..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10
                       text-white text-sm placeholder-gray-500 focus:outline-none
                       focus:border-indigo-500/50"
          />
        </div>
      </div>

      {/* Videos table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : videos.length === 0 ? (
        <div className="glass-card p-12 text-center text-gray-400">
          No videos match your filters
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          {/* Scrollable table for wide screens */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Video</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Category</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Trigger</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((video) => (
                  <tr key={video.id} className="border-b border-white/5 hover:bg-white/5">
                    {/* Video title + thumbnail */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {video.thumbnail_url ? (
                          <img
                            src={video.thumbnail_url}
                            alt=""
                            className="w-16 h-9 rounded object-cover"
                          />
                        ) : (
                          <div className="w-16 h-9 rounded bg-white/5" />
                        )}
                        <span className="text-white font-medium truncate max-w-[200px]">
                          {video.title || `${video.category} quiz`}
                        </span>
                      </div>
                    </td>
                    {/* Category badge */}
                    <td className="px-4 py-3">
                      <CategoryBadge category={video.category} />
                    </td>
                    {/* Status badge */}
                    <td className="px-4 py-3">
                      <StatusBadge status={video.status} />
                    </td>
                    {/* Trigger type */}
                    <td className="px-4 py-3 text-gray-400 capitalize">
                      {video.trigger_type}
                    </td>
                    {/* Relative timestamp */}
                    <td className="px-4 py-3 text-gray-400">
                      {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
              <span className="text-sm text-gray-400">
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="p-2 rounded-lg bg-white/5 text-gray-400
                             hover:text-white disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-2 rounded-lg bg-white/5 text-gray-400
                             hover:text-white disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
