"use client";

// ─────────────────────────────────────────────────────────────
//  Login page — centered card with email/password form.
//  Dark indigo glassmorphism theme with Leo branding.
//  On success: redirects to dashboard (/). On error: shows message.
// ─────────────────────────────────────────────────────────────

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // -- Handle form submission --
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Login successful — redirect to dashboard
        router.push("/");
        router.refresh();
      } else {
        // Show error message from API
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* -- Login card with glassmorphism -- */}
      <div className="glass-card p-8 w-full max-w-md">
        {/* -- Logo and title -- */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600
                          flex items-center justify-center mb-4">
            <Clapperboard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">LeoQuiz Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Sign in to manage your quiz videos</p>
        </div>

        {/* -- Login form -- */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email field */}
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10
                         text-white placeholder-gray-500 focus:outline-none
                         focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25
                         transition-colors"
              placeholder="admin@leoquiz.com"
              required
            />
          </div>

          {/* Password field with show/hide toggle */}
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10
                           text-white placeholder-gray-500 focus:outline-none
                           focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25
                           transition-colors pr-12"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                           hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20
                            rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600
                       text-white font-semibold hover:from-indigo-500 hover:to-purple-500
                       focus:outline-none focus:ring-2 focus:ring-indigo-500/50
                       transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
