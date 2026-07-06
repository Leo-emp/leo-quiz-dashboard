"use client";

// ─────────────────────────────────────────────────────────────
//  Generate page — two sections:
//  1. Manual Generate: pick format + category, click Generate
//  2. Auto Schedule: toggle auto-generation, set times
//
//  Format options:
//    Short (9:16, 6 rounds, ~66s) — for TikTok/Reels
//    Long-form (16:9, 60 rounds, ~10 min) — for YouTube
//    Mega Quiz (16:9, 100 rounds, ~15-20 min) — for YouTube
//    Daily Bundle (recommended) — Short + Long-form together
//
//  After triggering generation, polls for status every 10 seconds
//  until the pipeline completes and the webhook fires.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { Sparkles, Loader2, Film, Tv, Trophy, Layers } from "lucide-react";
import ScheduleForm from "@/components/schedule-form";
import StatusBadge from "@/components/status-badge";
import type { ScheduleConfig, VideoStatus } from "@/lib/types";

// -- Available quiz categories --
const categories = [
  { value: "auto", label: "Auto (Today's Rotation)", emoji: "🎲" },
  { value: "animals", label: "Animals", emoji: "🦁" },
  { value: "dinosaurs", label: "Dinosaurs", emoji: "🦕" },
  { value: "space", label: "Space", emoji: "🚀" },
  { value: "vehicles", label: "Vehicles", emoji: "🚗" },
  { value: "fruits", label: "Fruits & Vegetables", emoji: "🍎" },
  { value: "flags", label: "Country Flags", emoji: "🏳️" },
];

// -- Format options with preset round counts --
const formats = [
  {
    value: "daily_bundle",
    label: "Daily Bundle",
    desc: "Short + Long-form together",
    rounds: null,
    icon: Layers,
    recommended: true,
  },
  {
    value: "short",
    label: "Short",
    desc: "9:16 · 6 rounds · ~66s",
    rounds: 6,
    icon: Film,
    recommended: false,
  },
  {
    value: "long",
    label: "Long-form",
    desc: "16:9 · 60 rounds · ~10 min",
    rounds: 60,
    icon: Tv,
    recommended: false,
  },
  {
    value: "mega",
    label: "Mega Quiz",
    desc: "16:9 · 100 rounds · ~15 min",
    rounds: 100,
    icon: Trophy,
    recommended: false,
  },
];

// -- Type for tracking multiple video generation statuses --
type GenerationTracker = {
  videoId: string;
  format: string;
  status: string;
};

export default function GeneratePage() {
  // -- Manual generation state --
  const [category, setCategory] = useState("auto");
  const [format, setFormat] = useState("daily_bundle");
  const [generating, setGenerating] = useState(false);
  const [trackers, setTrackers] = useState<GenerationTracker[]>([]);

  // -- Schedule state --
  const [schedule, setSchedule] = useState<ScheduleConfig | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);

  // -- Load schedule config on mount --
  useEffect(() => {
    fetch("/api/schedule")
      .then((r) => r.json())
      .then(setSchedule)
      .catch(console.error);
  }, []);

  // -- Poll for generation status when videos are being generated --
  useEffect(() => {
    if (trackers.length === 0) return;

    // Only poll active trackers (not completed/failed)
    const activeTrackers = trackers.filter(
      (t) => t.status !== "pending" && t.status !== "failed"
    );
    if (activeTrackers.length === 0) {
      setGenerating(false);
      return;
    }

    const interval = setInterval(async () => {
      const updated = await Promise.all(
        trackers.map(async (tracker) => {
          // Skip polling for already-finished trackers
          if (tracker.status === "pending" || tracker.status === "failed") {
            return tracker;
          }
          try {
            const res = await fetch(`/api/videos/${tracker.videoId}/status`);
            const data = await res.json();
            const newStatus = data.video_status === "pending" || data.video_status === "failed"
              ? data.video_status
              : data.github_status || data.video_status;
            return { ...tracker, status: newStatus };
          } catch {
            return tracker;
          }
        })
      );
      setTrackers(updated);
    }, 10000);

    return () => clearInterval(interval);
  }, [trackers]);

  // -- Handle manual generation --
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setTrackers([]);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, format }),
      });

      const data = await res.json();

      if (res.ok) {
        if (format === "daily_bundle" && data.videos) {
          // Daily bundle returns an array of videos
          setTrackers(
            data.videos.map((v: { video_id: string; format: string }) => ({
              videoId: v.video_id,
              format: v.format,
              status: "dispatched",
            }))
          );
        } else {
          // Single video
          setTrackers([
            { videoId: data.video_id, format, status: "dispatched" },
          ]);
        }
      } else {
        setTrackers([{ videoId: "", format, status: `Error: ${data.error}` }]);
        setGenerating(false);
      }
    } catch {
      setTrackers([{ videoId: "", format, status: "Network error" }]);
      setGenerating(false);
    }
  }, [category, format]);

  // -- Handle schedule save --
  const handleSaveSchedule = async (updates: Partial<ScheduleConfig>) => {
    setSavingSchedule(true);
    try {
      const res = await fetch("/api/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      setSchedule(data);
    } catch (err) {
      console.error("Failed to save schedule:", err);
    } finally {
      setSavingSchedule(false);
    }
  };

  // -- Get the selected format's info --
  const selectedFormat = formats.find((f) => f.value === format);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Generate Video</h1>
        <p className="text-gray-400 text-sm mt-1">
          Choose a format, pick a category, and generate quiz videos
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* -- Manual Generate Card -- */}
        <div className="glass-card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            Manual Generate
          </h2>

          {/* Format selector — segmented radio buttons */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Format</label>
            <div className="grid grid-cols-2 gap-2">
              {formats.map((f) => {
                const Icon = f.icon;
                const isSelected = format === f.value;
                return (
                  <button
                    key={f.value}
                    onClick={() => setFormat(f.value)}
                    disabled={generating}
                    className={`relative flex flex-col items-start p-3 rounded-xl border text-left transition-all
                      ${isSelected
                        ? "border-indigo-500 bg-indigo-500/10 text-white"
                        : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-gray-300"
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {f.recommended && (
                      <span className="absolute -top-2 right-2 px-2 py-0.5 text-[10px] font-bold
                                       rounded-full bg-indigo-600 text-white uppercase tracking-wide">
                        Recommended
                      </span>
                    )}
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{f.label}</span>
                    </div>
                    <span className="text-xs text-gray-500">{f.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category selector */}
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={generating}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10
                         text-white text-sm focus:outline-none focus:border-indigo-500/50"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Rounds count — only shown for single formats, auto-set based on format */}
          {selectedFormat && selectedFormat.rounds !== null && (
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">
                Rounds
              </label>
              <input
                type="number"
                min={3}
                max={selectedFormat.value === "mega" ? 150 : selectedFormat.value === "long" ? 80 : 10}
                value={selectedFormat.rounds}
                disabled
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10
                           text-gray-500 text-sm cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Fixed at {selectedFormat.rounds} rounds for {selectedFormat.label}
              </p>
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                       bg-gradient-to-r from-indigo-600 to-purple-600 text-white
                       font-semibold hover:from-indigo-500 hover:to-purple-500
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate {selectedFormat?.label || "Video"}
              </>
            )}
          </button>

          {/* Generation status indicator(s) — supports multiple trackers for bundle */}
          {trackers.length > 0 && (
            <div className="space-y-2">
              {trackers.map((tracker, i) => (
                <div
                  key={tracker.videoId || i}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5"
                >
                  <StatusBadge
                    status={
                      (tracker.status === "pending" || tracker.status === "failed"
                        ? tracker.status
                        : "generating") as VideoStatus
                    }
                  />
                  <span className="text-sm text-gray-300">
                    {tracker.format === "short" ? "Short" : tracker.format === "long" ? "Long-form" : tracker.format === "mega" ? "Mega" : tracker.format}
                    : {tracker.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* -- Auto Schedule Card -- */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-5">Auto Schedule</h2>
          {schedule ? (
            <ScheduleForm
              config={schedule}
              onSave={handleSaveSchedule}
              saving={savingSchedule}
            />
          ) : (
            <p className="text-gray-500 text-sm">Loading schedule...</p>
          )}
        </div>
      </div>
    </div>
  );
}
