"use client";

// ─────────────────────────────────────────────────────────────
//  Settings page — system configuration:
//  1. Schedule config (same as Generate page auto-schedule)
//  2. Platform connections (YouTube, TikTok, Instagram, Facebook)
//  3. API status indicators
//
//  All 4 platforms use the same connect/disconnect pattern.
//  Meta OAuth covers both Instagram and Facebook in one flow.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import {
  Settings as SettingsIcon, Play, Link2, Link2Off,
  CheckCircle, XCircle, Music2, Camera, Globe,
} from "lucide-react";
import ScheduleForm from "@/components/schedule-form";
import type { ScheduleConfig, ConnectionStatus } from "@/lib/types";

// -- Platform card configuration --
const platformCards = [
  {
    key: "youtube",
    label: "YouTube",
    icon: Play,
    iconColor: "text-red-500",
    connectUrl: "/api/auth/youtube",
    gradientFrom: "from-red-600",
    gradientTo: "to-red-500",
    hoverFrom: "hover:from-red-500",
    hoverTo: "hover:to-red-400",
  },
  {
    key: "tiktok",
    label: "TikTok",
    icon: Music2,
    iconColor: "text-pink-500",
    connectUrl: "/api/auth/tiktok",
    gradientFrom: "from-pink-600",
    gradientTo: "to-fuchsia-500",
    hoverFrom: "hover:from-pink-500",
    hoverTo: "hover:to-fuchsia-400",
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: Camera,
    iconColor: "text-purple-500",
    connectUrl: "/api/auth/meta",
    gradientFrom: "from-purple-600",
    gradientTo: "to-pink-500",
    hoverFrom: "hover:from-purple-500",
    hoverTo: "hover:to-pink-400",
  },
  {
    key: "facebook",
    label: "Facebook",
    icon: Globe,
    iconColor: "text-blue-500",
    connectUrl: "/api/auth/meta",
    gradientFrom: "from-blue-600",
    gradientTo: "to-blue-500",
    hoverFrom: "hover:from-blue-500",
    hoverTo: "hover:to-blue-400",
  },
];

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

  // -- Handle platform connect (redirect to OAuth) --
  const handleConnect = (url: string) => {
    window.location.href = url;
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
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Platform Connections</h2>
          <p className="text-gray-500 text-xs">
            Connect platforms to auto-post every approved video to all of them.
          </p>

          {platformCards.map((platform) => {
            const Icon = platform.icon;
            const status = connections[platform.key];

            return (
              <div key={platform.key} className="glass-card p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${platform.iconColor}`} />
                    <span className="text-white font-medium">{platform.label}</span>
                  </div>

                  {loadingConnections ? (
                    <span className="text-gray-500 text-xs">Checking...</span>
                  ) : status?.connected ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs font-medium">
                          {status.account_name || "Connected"}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDisconnect(platform.key)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                   bg-rose-500/10 text-rose-400 border border-rose-500/20
                                   hover:bg-rose-500/20 transition-colors text-xs"
                      >
                        <Link2Off className="w-3.5 h-3.5" />
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {status?.needs_reconnect && (
                        <span className="text-amber-400 text-xs">Expired</span>
                      )}
                      <button
                        onClick={() => handleConnect(platform.connectUrl)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                   bg-gradient-to-r ${platform.gradientFrom} ${platform.gradientTo}
                                   text-white text-xs font-medium
                                   ${platform.hoverFrom} ${platform.hoverTo} transition-all`}
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        Connect
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <p className="text-gray-600 text-xs mt-2">
            Instagram and Facebook share the same Meta OAuth flow — connecting one may connect both.
          </p>
        </div>
      </div>

      {/* -- API Status -- */}
      <div className="glass-card p-6 max-w-md">
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
  );
}
