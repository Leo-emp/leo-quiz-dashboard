"use client";

// ─────────────────────────────────────────────────────────────
//  Analytics dashboard — cross-platform performance metrics.
//  Shows overview cards, daily views trend, category performance,
//  and top videos table. All data from /api/analytics/* endpoints.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3, Eye, Users, Film, Target, RefreshCw, Loader2,
} from "lucide-react";
import {
  StatCard, LineChart, BarChart, PlatformLegend,
} from "@/components/analytics-charts";
import type { AnalyticsOverview } from "@/lib/types";

// -- Period options for the time range selector --
const periods = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "all", label: "All Time" },
];

const PLATFORMS = ["youtube", "tiktok", "instagram", "facebook"];

// -- Type for views time series data --
type ViewsDataPoint = {
  date: string;
  youtube: number;
  tiktok: number;
  instagram: number;
  facebook: number;
};

// -- Type for category performance data --
type CategoryData = {
  category: string;
  avg_views: number;
  total_views: number;
};

// -- Type for top video entry --
type TopVideo = {
  id: string;
  title: string;
  category: string;
  thumbnail_url: string | null;
  total_views: number;
  created_at: string;
};

export default function AnalyticsPage() {
  // -- State --
  const [period, setPeriod] = useState("30d");
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [viewsData, setViewsData] = useState<ViewsDataPoint[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [topVideos, setTopVideos] = useState<TopVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // -- Fetch all analytics data --
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, viewsRes, categoriesRes, topRes] = await Promise.all([
        fetch("/api/analytics/overview"),
        fetch(`/api/analytics/views?period=${period}`),
        fetch("/api/analytics/categories"),
        fetch("/api/analytics/top-videos?limit=10"),
      ]);

      if (overviewRes.ok) setOverview(await overviewRes.json());
      if (viewsRes.ok) setViewsData(await viewsRes.json());
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
      if (topRes.ok) setTopVideos(await topRes.json());
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -- Handle manual refresh --
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch("/api/analytics/refresh", { method: "POST" });
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header with period selector and refresh button */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            Analytics
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Cross-platform performance metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="flex rounded-xl bg-white/5 border border-white/10 overflow-hidden">
            {periods.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors
                  ${period === p.value
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "text-gray-500 hover:text-gray-300"
                  }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                       bg-white/5 border border-white/10 text-gray-400
                       hover:text-white hover:bg-white/10 transition-colors text-xs"
          >
            {refreshing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* Overview cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Views"
              value={overview?.total_views ?? 0}
              icon={<Eye className="w-5 h-5" />}
            />
            <StatCard
              label="Subscribers"
              value={Object.values(overview?.total_subscribers ?? {}).reduce((a, b) => a + b, 0)}
              icon={<Users className="w-5 h-5" />}
              subtitle={
                Object.entries(overview?.total_subscribers ?? {})
                  .map(([p, n]) => `${p}: ${n.toLocaleString()}`)
                  .join(" · ") || "No data"
              }
            />
            <StatCard
              label="Videos This Week"
              value={overview?.videos_this_week ?? 0}
              icon={<Film className="w-5 h-5" />}
            />
            <StatCard
              label="Avg CTR"
              value={`${((overview?.average_ctr ?? 0) * 100).toFixed(1)}%`}
              icon={<Target className="w-5 h-5" />}
            />
          </div>

          {/* Daily views chart */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Daily Views</h2>
              <PlatformLegend platforms={PLATFORMS} />
            </div>
            <LineChart
              data={viewsData}
              lines={PLATFORMS}
              height={250}
            />
          </div>

          {/* Category performance */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Category Performance</h2>
            <BarChart data={categories} height={220} />
          </div>

          {/* Top videos table */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Top Videos</h2>
            {topVideos.length === 0 ? (
              <p className="text-gray-500 text-sm">No video data yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-gray-500 font-medium py-2 px-3">#</th>
                      <th className="text-left text-gray-500 font-medium py-2 px-3">Title</th>
                      <th className="text-left text-gray-500 font-medium py-2 px-3">Category</th>
                      <th className="text-right text-gray-500 font-medium py-2 px-3">Views</th>
                      <th className="text-right text-gray-500 font-medium py-2 px-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topVideos.map((video, i) => (
                      <tr key={video.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-2.5 px-3 text-gray-500">{i + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-3">
                            {video.thumbnail_url ? (
                              <img
                                src={video.thumbnail_url}
                                alt=""
                                className="w-12 h-8 rounded object-cover"
                              />
                            ) : (
                              <div className="w-12 h-8 rounded bg-white/5" />
                            )}
                            <span className="text-white truncate max-w-[200px]">
                              {video.title || `Quiz: ${video.category}`}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-gray-400 capitalize">{video.category}</td>
                        <td className="py-2.5 px-3 text-right text-white font-medium">
                          {video.total_views.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-500">
                          {video.created_at ? new Date(video.created_at).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
