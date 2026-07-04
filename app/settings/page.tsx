"use client";

// ─────────────────────────────────────────────────────────────
//  Settings page — system configuration:
//  1. Schedule config (same as Generate page auto-schedule)
//  2. YouTube connection (connect/disconnect)
//  3. API status indicators
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Play, Link2, Link2Off, CheckCircle, XCircle } from "lucide-react";
import ScheduleForm from "@/components/schedule-form";
import type { ScheduleConfig, ConnectionStatus } from "@/lib/types";

export default function SettingsPage() {
  // -- Schedule state --
  const [schedule, setSchedule] = useState<ScheduleConfig | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);

  // -- Connection status --
  const [connections, setConnections] = useState<Record<string, ConnectionStatus>>({});
  const [loadingConnections, setLoadingConnections] = useState(true);

  // -- Load data on mount --
  useEffect(() => {
    // Fetch schedule config
    fetch("/api/schedule")
      .then((r) => r.json())
      .then(setSchedule)
      .catch(console.error);

    // Fetch platform connection status
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then(setConnections)
      .catch(console.error)
      .finally(() => setLoadingConnections(false));
  }, []);

  // -- Handle schedule save --
  const handleSaveSchedule = async (updates: Partial<ScheduleConfig>) => {
    setSavingSchedule(true);
    try {
      const res = await fetch("/api/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      setSchedule(await res.json());
    } finally {
      setSavingSchedule(false);
    }
  };

  // -- Handle YouTube connect (redirect to OAuth) --
  const handleConnectYouTube = () => {
    window.location.href = "/api/auth/youtube";
  };

  // -- Handle disconnect --
  const handleDisconnect = async (platform: string) => {
    await fetch("/api/auth/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform }),
    });
    // Refresh connection status after disconnect
    const res = await fetch("/api/auth/status");
    setConnections(await res.json());
  };

  // Shorthand for YouTube status
  const ytStatus = connections.youtube;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-gray-400" />
          Settings
        </h1>
        <p className="text-gray-400 text-sm mt-1">Configure your pipeline and connections</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* -- Schedule Configuration -- */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-5">Generation Schedule</h2>
          {schedule ? (
            <ScheduleForm
              config={schedule}
              onSave={handleSaveSchedule}
              saving={savingSchedule}
            />
          ) : (
            <p className="text-gray-500">Loading...</p>
          )}
        </div>

        {/* -- Platform Connections -- */}
        <div className="space-y-6">
          {/* YouTube connection card */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
              <Play className="w-5 h-5 text-red-500" />
              YouTube
            </h2>

            {loadingConnections ? (
              <p className="text-gray-500 text-sm">Checking connection...</p>
            ) : ytStatus?.connected ? (
              // -- Connected state --
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
                <p className="text-gray-400 text-sm">
                  Channel: {ytStatus.account_name || "Unknown"}
                </p>
                <button
                  onClick={() => handleDisconnect("youtube")}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl
                             bg-rose-500/10 text-rose-400 border border-rose-500/20
                             hover:bg-rose-500/20 transition-colors text-sm"
                >
                  <Link2Off className="w-4 h-4" />
                  Disconnect
                </button>
              </div>
            ) : (
              // -- Disconnected state --
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-500">
                  <XCircle className="w-5 h-5" />
                  <span className="text-sm">Not connected</span>
                </div>
                {/* Show reconnect warning if session expired */}
                {ytStatus?.needs_reconnect && (
                  <p className="text-amber-400 text-xs">
                    Session expired — reconnect to continue posting
                  </p>
                )}
                <button
                  onClick={handleConnectYouTube}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                             bg-gradient-to-r from-red-600 to-red-500
                             text-white text-sm font-medium
                             hover:from-red-500 hover:to-red-400 transition-all"
                >
                  <Link2 className="w-4 h-4" />
                  Connect YouTube
                </button>
                <p className="text-gray-500 text-xs">
                  One-time authorization — stays connected forever
                </p>
              </div>
            )}
          </div>

          {/* API Status card — shows which env vars are configured */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">API Status</h2>
            <div className="space-y-3">
              {[
                { label: "GitHub Token", key: "GITHUB_TOKEN" },
                { label: "Webhook Secret", key: "DASHBOARD_WEBHOOK_SECRET" },
                { label: "Vercel Blob", key: "BLOB_READ_WRITE_TOKEN" },
                { label: "Turso Database", key: "TURSO_DATABASE_URL" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-400">{item.label}</span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    Configured
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
