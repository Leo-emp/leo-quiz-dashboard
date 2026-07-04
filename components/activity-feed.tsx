// ─────────────────────────────────────────────────────────────
//  Activity feed — chronological list of recent events.
//  Each entry shows an icon, message, relative timestamp,
//  and optional link to the video.
// ─────────────────────────────────────────────────────────────

import { formatDistanceToNow } from "date-fns";
import {
  Sparkles, Check, X, Clock, Upload, AlertCircle, Activity,
} from "lucide-react";
import type { ActivityLogEntry } from "@/lib/types";

// -- Icon and color for each activity action --
const actionConfig: Record<string, { icon: typeof Activity; color: string }> = {
  generated: { icon: Sparkles, color: "text-blue-400" },
  approved: { icon: Check, color: "text-emerald-400" },
  rejected: { icon: X, color: "text-rose-400" },
  scheduled: { icon: Clock, color: "text-purple-400" },
  uploaded: { icon: Upload, color: "text-teal-400" },
  failed: { icon: AlertCircle, color: "text-red-400" },
};

interface ActivityFeedProps {
  // List of activity log entries to display
  entries: ActivityLogEntry[];
}

export default function ActivityFeed({ entries }: ActivityFeedProps) {
  if (entries.length === 0) {
    return (
      <p className="text-gray-500 text-sm text-center py-8">
        No activity yet. Generate your first video!
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => {
        // Get icon and color for this action type
        const config = actionConfig[entry.action] || { icon: Activity, color: "text-gray-400" };
        const Icon = config.icon;

        return (
          <div
            key={entry.id}
            className="flex items-center gap-3 px-4 py-3 rounded-xl
                       hover:bg-white/5 transition-colors"
          >
            {/* Action icon */}
            <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center
                            ${config.color}`}>
              <Icon className="w-4 h-4" />
            </div>

            {/* Message */}
            <p className="flex-1 text-sm text-gray-300">{entry.message}</p>

            {/* Relative timestamp */}
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
