// ─────────────────────────────────────────────────────────────
//  Dashboard overview page — shows key metrics and recent activity.
//  Stats: videos today, this week, total, pending approval count.
//  Activity feed: last 20 events with action icons and timestamps.
// ─────────────────────────────────────────────────────────────

import { Video, Clock, CheckSquare, BarChart3 } from "lucide-react";
import StatsCard from "@/components/stats-card";
import ActivityFeed from "@/components/activity-feed";
import { getVideoStats, getRecentActivity, initializeDatabase } from "@/lib/db";

export default async function DashboardPage() {
  // Initialize DB on first load (safe to call multiple times)
  await initializeDatabase();

  // Fetch stats and activity in parallel
  const [stats, activity] = await Promise.all([
    getVideoStats(),
    getRecentActivity(20),
  ]);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">
          Overview of your Leo Quiz video pipeline
        </p>
      </div>

      {/* Stats cards — 4 across on desktop, 2x2 on mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={Video}
          label="Videos Today"
          value={stats.today}
          gradient="from-blue-500 to-cyan-500"
        />
        <StatsCard
          icon={BarChart3}
          label="This Week"
          value={stats.week}
          gradient="from-indigo-500 to-purple-600"
        />
        <StatsCard
          icon={CheckSquare}
          label="Pending Approval"
          value={stats.pending}
          gradient="from-amber-500 to-orange-500"
        />
        <StatsCard
          icon={Clock}
          label="Total Videos"
          value={stats.total}
          gradient="from-emerald-500 to-teal-500"
        />
      </div>

      {/* Recent activity feed */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
        <ActivityFeed entries={activity} />
      </div>
    </div>
  );
}
