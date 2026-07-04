import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Explicitly pin the workspace root to this project folder.
  // Without this, Next.js/Turbopack can get confused if it finds
  // another package-lock.json further up the directory tree (e.g.
  // an unrelated one in C:\Users\User) and infers the wrong root.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
