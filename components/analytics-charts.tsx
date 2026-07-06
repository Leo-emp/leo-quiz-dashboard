"use client";

// ─────────────────────────────────────────────────────────────
//  Pure SVG chart components for the analytics dashboard.
//  No external dependencies — renders inline SVG.
//  Platform colors: YouTube=red, TikTok=pink, Instagram=purple, Facebook=blue
// ─────────────────────────────────────────────────────────────

import type { ReactNode } from "react";

// -- Platform color map --
const PLATFORM_COLORS: Record<string, string> = {
  youtube: "#ef4444",
  tiktok: "#ec4899",
  instagram: "#a855f7",
  facebook: "#3b82f6",
};

// ─── Stat Card ─────────────────────────────────────────────

type StatCardProps = {
  label: string;
  value: string | number;
  icon: ReactNode;
  subtitle?: string;
};

export function StatCard({ label, value, icon, subtitle }: StatCardProps) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{label}</span>
        <span className="text-gray-500">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-white">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

// ─── Line Chart ────────────────────────────────────────────

type LineChartPoint = {
  date: string;
  [platform: string]: string | number;
};

type LineChartProps = {
  data: LineChartPoint[];
  lines: string[];
  height?: number;
};

export function LineChart({ data, lines, height = 200 }: LineChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-500 text-sm" style={{ height }}>
        No data yet
      </div>
    );
  }

  const width = 600;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Find max value across all lines
  let maxVal = 0;
  for (const point of data) {
    for (const line of lines) {
      const v = Number(point[line] || 0);
      if (v > maxVal) maxVal = v;
    }
  }
  if (maxVal === 0) maxVal = 1;

  // Scale functions
  const xScale = (i: number) => padding.left + (i / Math.max(data.length - 1, 1)) * chartW;
  const yScale = (v: number) => padding.top + chartH - (v / maxVal) * chartH;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
        <line
          key={frac}
          x1={padding.left} y1={yScale(maxVal * frac)}
          x2={width - padding.right} y2={yScale(maxVal * frac)}
          stroke="rgba(255,255,255,0.05)" strokeWidth={1}
        />
      ))}

      {/* Y-axis labels */}
      {[0, 0.5, 1].map((frac) => (
        <text
          key={frac}
          x={padding.left - 8} y={yScale(maxVal * frac) + 4}
          fill="#6b7280" fontSize={10} textAnchor="end"
        >
          {Math.round(maxVal * frac).toLocaleString()}
        </text>
      ))}

      {/* X-axis labels (show ~5 dates) */}
      {data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 5)) === 0).map((point, i, arr) => (
        <text
          key={point.date}
          x={xScale(data.indexOf(point))} y={height - 5}
          fill="#6b7280" fontSize={9} textAnchor="middle"
        >
          {point.date.slice(5)}
        </text>
      ))}

      {/* Data lines */}
      {lines.map((line) => {
        const points = data.map((d, i) => `${xScale(i)},${yScale(Number(d[line] || 0))}`).join(" ");
        return (
          <polyline
            key={line}
            points={points}
            fill="none"
            stroke={PLATFORM_COLORS[line] || "#818cf8"}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
}

// ─── Bar Chart ─────────────────────────────────────────────

type BarChartItem = {
  category: string;
  avg_views: number;
  total_views: number;
};

type BarChartProps = {
  data: BarChartItem[];
  height?: number;
};

export function BarChart({ data, height = 200 }: BarChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-500 text-sm" style={{ height }}>
        No data yet
      </div>
    );
  }

  const width = 600;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map((d) => d.avg_views), 1);
  const barWidth = Math.min(50, chartW / data.length - 10);
  const gap = (chartW - barWidth * data.length) / (data.length + 1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {[0, 0.5, 1].map((frac) => (
        <line
          key={frac}
          x1={padding.left} y1={padding.top + chartH * (1 - frac)}
          x2={width - padding.right} y2={padding.top + chartH * (1 - frac)}
          stroke="rgba(255,255,255,0.05)" strokeWidth={1}
        />
      ))}

      {/* Bars */}
      {data.map((item, i) => {
        const barH = (item.avg_views / maxVal) * chartH;
        const x = padding.left + gap * (i + 1) + barWidth * i;
        const y = padding.top + chartH - barH;

        return (
          <g key={item.category}>
            <rect
              x={x} y={y} width={barWidth} height={barH}
              rx={4} fill="url(#barGradient)" opacity={0.9}
            />
            {/* Category label */}
            <text
              x={x + barWidth / 2} y={height - 8}
              fill="#9ca3af" fontSize={9} textAnchor="middle"
            >
              {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
            </text>
            {/* Value on top */}
            <text
              x={x + barWidth / 2} y={y - 5}
              fill="#d1d5db" fontSize={9} textAnchor="middle"
            >
              {item.avg_views.toLocaleString()}
            </text>
          </g>
        );
      })}

      {/* Gradient definition */}
      <defs>
        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── Legend ────────────────────────────────────────────────

export function PlatformLegend({ platforms }: { platforms: string[] }) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      {platforms.map((p) => (
        <div key={p} className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: PLATFORM_COLORS[p] || "#818cf8" }}
          />
          <span className="text-xs text-gray-400 capitalize">{p}</span>
        </div>
      ))}
    </div>
  );
}
