"use client";

// ─────────────────────────────────────────────────────────────
//  Metadata editor — editable title, description, tags, hashtags.
//  Pre-filled with Gemini auto-generated content.
//  Changes are passed up via onChange callback.
// ─────────────────────────────────────────────────────────────

import { useState } from "react";
import { X, Plus } from "lucide-react";
import type { Video, Platform } from "@/lib/types";

interface MetadataEditorProps {
  // The video being edited
  video: Video;
  // Callback when any field changes
  onChange: (updates: Partial<Video>) => void;
}

export default function MetadataEditor({ video, onChange }: MetadataEditorProps) {
  // Parse JSON arrays for tags and hashtags
  const [tags, setTags] = useState<string[]>(
    video.tags ? JSON.parse(video.tags) : []
  );
  const [hashtags, setHashtags] = useState<string[]>(
    video.hashtags ? JSON.parse(video.hashtags) : []
  );
  const [newTag, setNewTag] = useState("");
  const [newHashtag, setNewHashtag] = useState("");

  // -- Add a tag --
  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updated = [...tags, newTag.trim()];
      setTags(updated);
      setNewTag("");
      onChange({ tags: JSON.stringify(updated) });
    }
  };

  // -- Remove a tag --
  const removeTag = (tag: string) => {
    const updated = tags.filter((t) => t !== tag);
    setTags(updated);
    onChange({ tags: JSON.stringify(updated) });
  };

  // -- Add a hashtag --
  const addHashtag = () => {
    let ht = newHashtag.trim();
    if (ht && !ht.startsWith("#")) ht = `#${ht}`;
    if (ht && !hashtags.includes(ht)) {
      const updated = [...hashtags, ht];
      setHashtags(updated);
      setNewHashtag("");
      onChange({ hashtags: JSON.stringify(updated) });
    }
  };

  // -- Remove a hashtag --
  const removeHashtag = (ht: string) => {
    const updated = hashtags.filter((h) => h !== ht);
    setHashtags(updated);
    onChange({ hashtags: JSON.stringify(updated) });
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm text-gray-300 mb-1.5">Title</label>
        <input
          type="text"
          defaultValue={video.title || ""}
          onChange={(e) => onChange({ title: e.target.value })}
          className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10
                     text-white text-sm focus:outline-none focus:border-indigo-500/50
                     transition-colors"
          placeholder="Video title..."
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm text-gray-300 mb-1.5">Description</label>
        <textarea
          defaultValue={video.description || ""}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={3}
          className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10
                     text-white text-sm focus:outline-none focus:border-indigo-500/50
                     transition-colors resize-none"
          placeholder="Video description..."
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm text-gray-300 mb-1.5">Tags</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg
                         bg-indigo-500/15 text-indigo-300 text-xs"
            >
              {tag}
              <button onClick={() => removeTag(tag)} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                       text-white text-sm focus:outline-none focus:border-indigo-500/50"
            placeholder="Add tag..."
          />
          <button
            onClick={addTag}
            className="px-3 py-2 rounded-lg bg-indigo-500/20 text-indigo-300
                       hover:bg-indigo-500/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hashtags */}
      <div>
        <label className="block text-sm text-gray-300 mb-1.5">Hashtags</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {hashtags.map((ht) => (
            <span
              key={ht}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg
                         bg-purple-500/15 text-purple-300 text-xs"
            >
              {ht}
              <button onClick={() => removeHashtag(ht)} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newHashtag}
            onChange={(e) => setNewHashtag(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHashtag())}
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                       text-white text-sm focus:outline-none focus:border-indigo-500/50"
            placeholder="Add hashtag..."
          />
          <button
            onClick={addHashtag}
            className="px-3 py-2 rounded-lg bg-purple-500/20 text-purple-300
                       hover:bg-purple-500/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Platform selector */}
      <div>
        <label className="block text-sm text-gray-300 mb-1.5">Platform</label>
        <select
          defaultValue={video.platform || "both"}
          onChange={(e) => onChange({ platform: e.target.value as Platform })}
          className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10
                     text-white text-sm focus:outline-none focus:border-indigo-500/50
                     transition-colors"
        >
          <option value="both">YouTube + TikTok</option>
          <option value="youtube">YouTube Only</option>
          <option value="tiktok">TikTok Only</option>
        </select>
      </div>
    </div>
  );
}
