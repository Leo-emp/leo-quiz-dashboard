// ─────────────────────────────────────────────────────────────
//  Stats card — displays a single metric with icon.
//  Used on the dashboard overview for key numbers.
//  Glassmorphism styling with gradient icon background.
// ─────────────────────────────────────────────────────────────

import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  // Lucide icon component
  icon: LucideIcon;
  // Metric label (e.g., "Videos Today")
  label: string;
  // Main value (e.g., "12")
  value: string | number;
  // Optional subtitle below the value (e.g., "3 this week")
  subtitle?: string;
  // Optional gradient class for the icon background
  gradient?: string;
}

export default function StatsCard({
  icon: Icon,
  label,
  value,
  subtitle,
  gradient = "from-indigo-500 to-purple-600",
}: StatsCardProps) {
  return (
    <div className="glass-card-hover p-5">
      <div className="flex items-start justify-between">
        {/* Icon with gradient background */}
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient}
                        flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {/* Value — large, prominent */}
        <span className="text-3xl font-bold text-white">{value}</span>
      </div>
      {/* Label */}
      <p className="text-sm text-gray-400 mt-3">{label}</p>
      {/* Optional subtitle */}
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
}
