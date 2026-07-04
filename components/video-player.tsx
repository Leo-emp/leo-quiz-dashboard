// ─────────────────────────────────────────────────────────────
//  Video player — inline HTML5 video element.
//  Plays videos from Vercel Blob URLs.
//  Shows a placeholder when no video URL is available.
// ─────────────────────────────────────────────────────────────

import { Play } from "lucide-react";

interface VideoPlayerProps {
  // Vercel Blob URL of the video
  url: string | null;
  // Optional poster/thumbnail image
  poster?: string | null;
}

export default function VideoPlayer({ url, poster }: VideoPlayerProps) {
  // No video URL — show placeholder
  if (!url) {
    return (
      <div className="aspect-[9/16] max-h-[400px] bg-white/5 rounded-xl
                      flex items-center justify-center">
        <div className="text-center text-gray-500">
          <Play className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Video not available</p>
        </div>
      </div>
    );
  }

  return (
    <video
      src={url}
      poster={poster || undefined}
      controls
      className="aspect-[9/16] max-h-[400px] w-auto rounded-xl bg-black"
      preload="metadata"
    >
      Your browser does not support video playback.
    </video>
  );
}
