// ─────────────────────────────────────────────────────────────
//  Status badge — color-coded pill for video lifecycle states.
//  Each status gets a unique color:
//    generating: blue (pulse), pending: amber, approved: emerald,
//    scheduled: purple, uploaded: teal, rejected: rose, failed: red
// ─────────────────────────────────────────────────────────────

import type { VideoStatus } from "@/lib/types";

// -- Color mapping for each status --
const statusColors: Record<VideoStatus, string> = {
  generating: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  scheduled: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  uploaded: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  rejected: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
};

// -- Labels with proper capitalization --
const statusLabels: Record<VideoStatus, string> = {
  generating: "Generating",
  pending: "Pending",
  approved: "Approved",
  scheduled: "Scheduled",
  uploaded: "Uploaded",
  rejected: "Rejected",
  failed: "Failed",
};

export default function StatusBadge({ status }: { status: VideoStatus }) {
  const colorClass = statusColors[status] || statusColors.pending;
  const label = statusLabels[status] || status;

  // "generating" status gets the pulse animation
  const pulseClass = status === "generating" ? "animate-pulse-glow" : "";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs
                  font-medium border ${colorClass} ${pulseClass}`}
    >
      {label}
    </span>
  );
}
