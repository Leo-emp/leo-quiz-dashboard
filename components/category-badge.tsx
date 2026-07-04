// ─────────────────────────────────────────────────────────────
//  Category badge — color-coded label matching pipeline themes.
//  Colors mirror the CATEGORY_COLORS from the Python pipeline's
//  config.py for visual consistency across the system.
// ─────────────────────────────────────────────────────────────

import type { Category } from "@/lib/types";

// -- Color mapping for each quiz category --
const categoryStyles: Record<Category, { bg: string; text: string; emoji: string }> = {
  animals:   { bg: "bg-emerald-500/20", text: "text-emerald-400", emoji: "🦁" },
  dinosaurs: { bg: "bg-orange-500/20",  text: "text-orange-400",  emoji: "🦕" },
  space:     { bg: "bg-blue-500/20",    text: "text-blue-400",    emoji: "🚀" },
  vehicles:  { bg: "bg-red-500/20",     text: "text-red-400",     emoji: "🚗" },
  fruits:    { bg: "bg-yellow-500/20",   text: "text-yellow-400",  emoji: "🍎" },
  flags:     { bg: "bg-purple-500/20",   text: "text-purple-400",  emoji: "🏳️" },
};

export default function CategoryBadge({ category }: { category: Category }) {
  const style = categoryStyles[category] || categoryStyles.animals;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                     text-xs font-medium ${style.bg} ${style.text}`}>
      <span>{style.emoji}</span>
      {category.charAt(0).toUpperCase() + category.slice(1)}
    </span>
  );
}
