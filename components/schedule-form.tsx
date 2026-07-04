"use client";

// ─────────────────────────────────────────────────────────────
//  Schedule form — configure auto-generation schedule.
//  Toggle on/off, set daily time, weekly compilation day.
//  Shows the day-of-week category rotation.
// ─────────────────────────────────────────────────────────────

import { useState } from "react";
import { Save, Clock } from "lucide-react";
import type { ScheduleConfig } from "@/lib/types";

// -- Day-of-week category rotation (matches pipeline config.py) --
const dayCategories = [
  { day: "Monday", category: "Animals", emoji: "🦁" },
  { day: "Tuesday", category: "Dinosaurs", emoji: "🦕" },
  { day: "Wednesday", category: "Space", emoji: "🚀" },
  { day: "Thursday", category: "Vehicles", emoji: "🚗" },
  { day: "Friday", category: "Fruits", emoji: "🍎" },
  { day: "Saturday", category: "Flags", emoji: "🏳️" },
  { day: "Sunday", category: "Mixed", emoji: "🎲" },
];

// -- Day names for the weekly compilation picker --
const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface ScheduleFormProps {
  // Current schedule configuration
  config: ScheduleConfig;
  // Callback when the user saves changes
  onSave: (updates: Partial<ScheduleConfig>) => void;
  // Whether a save is in progress
  saving?: boolean;
}

export default function ScheduleForm({ config, onSave, saving }: ScheduleFormProps) {
  // Local state for form fields
  const [autoEnabled, setAutoEnabled] = useState(config.auto_enabled);
  const [dailyHour, setDailyHour] = useState(config.daily_hour_utc);
  const [dailyMinute, setDailyMinute] = useState(config.daily_minute_utc);
  const [weeklyDay, setWeeklyDay] = useState(config.weekly_day);
  const [weeklyHour, setWeeklyHour] = useState(config.weekly_hour_utc);

  // -- Handle save --
  const handleSave = () => {
    onSave({
      auto_enabled: autoEnabled,
      daily_hour_utc: dailyHour,
      daily_minute_utc: dailyMinute,
      weekly_day: weeklyDay,
      weekly_hour_utc: weeklyHour,
    });
  };

  return (
    <div className="space-y-6">
      {/* Auto-generation toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-medium">Auto-Generation</h3>
          <p className="text-sm text-gray-400">Automatically generate videos on schedule</p>
        </div>
        <button
          onClick={() => setAutoEnabled(!autoEnabled)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            autoEnabled ? "bg-indigo-500" : "bg-white/10"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white
                        transition-transform ${autoEnabled ? "translate-x-6" : ""}`}
          />
        </button>
      </div>

      {/* Daily schedule (visible when auto is on) */}
      {autoEnabled && (
        <>
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">
              <Clock className="w-4 h-4 inline mr-1" />
              Daily Generation Time (UTC)
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={0}
                max={23}
                value={dailyHour}
                onChange={(e) => setDailyHour(Number(e.target.value))}
                className="w-20 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                           text-white text-sm text-center"
              />
              <span className="text-gray-400">:</span>
              <input
                type="number"
                min={0}
                max={59}
                step={15}
                value={dailyMinute}
                onChange={(e) => setDailyMinute(Number(e.target.value))}
                className="w-20 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                           text-white text-sm text-center"
              />
              <span className="text-gray-500 text-sm">UTC</span>
            </div>
          </div>

          {/* Weekly compilation day */}
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">
              Weekly Compilation Day
            </label>
            <select
              value={weeklyDay}
              onChange={(e) => setWeeklyDay(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10
                         text-white text-sm"
            >
              {weekDays.map((day, i) => (
                <option key={day} value={i}>{day}</option>
              ))}
            </select>
          </div>

          {/* Category rotation display (read-only) */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Category Rotation</label>
            <div className="grid grid-cols-2 gap-2">
              {dayCategories.map((dc) => (
                <div
                  key={dc.day}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5
                             text-sm"
                >
                  <span>{dc.emoji}</span>
                  <span className="text-gray-400">{dc.day}:</span>
                  <span className="text-white">{dc.category}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                   bg-gradient-to-r from-indigo-600 to-purple-600
                   text-white text-sm font-medium
                   hover:from-indigo-500 hover:to-purple-500
                   disabled:opacity-50 transition-all"
      >
        <Save className="w-4 h-4" />
        {saving ? "Saving..." : "Save Schedule"}
      </button>
    </div>
  );
}
