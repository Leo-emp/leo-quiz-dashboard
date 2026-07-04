"use client";

// ─────────────────────────────────────────────────────────────
//  Date/time picker — for scheduling video posts.
//  Uses native HTML datetime-local input with custom styling.
//  Returns ISO timestamp strings.
// ─────────────────────────────────────────────────────────────

interface DateTimePickerProps {
  // ISO timestamp value (or empty)
  value: string;
  // Callback when the user picks a date/time
  onChange: (isoTimestamp: string) => void;
  // Label text
  label?: string;
}

export default function DateTimePicker({
  value,
  onChange,
  label = "Schedule for",
}: DateTimePickerProps) {
  // Convert ISO timestamp to datetime-local format (YYYY-MM-DDTHH:mm)
  const localValue = value ? value.slice(0, 16) : "";

  return (
    <div>
      <label className="block text-sm text-gray-300 mb-1.5">{label}</label>
      <input
        type="datetime-local"
        value={localValue}
        onChange={(e) => {
          // Convert local datetime back to ISO timestamp
          const dt = new Date(e.target.value);
          onChange(dt.toISOString());
        }}
        // Set minimum to now — can't schedule in the past
        min={new Date().toISOString().slice(0, 16)}
        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10
                   text-white text-sm focus:outline-none focus:border-indigo-500/50
                   transition-colors [color-scheme:dark]"
      />
    </div>
  );
}
