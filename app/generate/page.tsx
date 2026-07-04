"use client";

// ─────────────────────────────────────────────────────────────
//  Generate page — two sections:
//  1. Manual Generate: pick category + rounds, click Generate
//  2. Auto Schedule: toggle auto-generation, set times
//
//  After triggering generation, polls for status every 10 seconds
//  until the pipeline completes and the webhook fires.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { Sparkles, Loader2 } from "lucide-react";
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

export default function GeneratePage() {
  // -- Manual generation state --
  const [category, setCategory] = useState("auto");
  const [rounds, setRounds] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [generatingVideoId, setGeneratingVideoId] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);

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

  // -- Poll for generation status when a video is being generated --
  useEffect(() => {
    if (!generatingVideoId) return;

    // Poll every 10 seconds until the pipeline finishes
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/videos/${generatingVideoId}/status`);
        const data = await res.json();

        // Update the status display
        setGenerationStatus(data.github_status || data.video_status);

        // Stop polling if complete or failed
        if (data.video_status === "pending" || data.video_status === "failed") {
          setGenerating(false);
          setGeneratingVideoId(null);
          clearInterval(interval);
        }
      } catch {
        // Ignore polling errors — will retry on next interval
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [generatingVideoId]);

  // -- Handle manual generation --
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setGenerationStatus("queued");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, rounds }),
      });

      const data = await res.json();

      if (res.ok) {
        // Pipeline dispatched — start polling for status
        setGeneratingVideoId(data.video_id);
        setGenerationStatus("dispatched");
      } else {
        setGenerationStatus(`Error: ${data.error}`);
        setGenerating(false);
      }
    } catch {
      setGenerationStatus("Network error");
      setGenerating(false);
    }
  }, [category, rounds]);

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

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Generate Video</h1>
        <p className="text-gray-400 text-sm mt-1">
          Trigger video generation manually or configure auto-generation
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* -- Manual Generate Card -- */}
        <div className="glass-card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            Manual Generate
          </h2>

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

          {/* Rounds count */}
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">
              Number of Rounds
            </label>
            <input
              type="number"
              min={3}
              max={10}
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
              disabled={generating}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10
                         text-white text-sm focus:outline-none focus:border-indigo-500/50"
            />
          </div>

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
                Generate Video
              </>
            )}
          </button>

          {/* Generation status indicator */}
          {generationStatus && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5">
              <StatusBadge status={(generationStatus === "completed" ? "pending" : "generating") as VideoStatus} />
              <span className="text-sm text-gray-300">
                Pipeline: {generationStatus}
              </span>
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
