// ─────────────────────────────────────────────────────────────
//  Tailwind CSS configuration.
//
//  NOTE: This project uses Tailwind CSS v4, which moved to a
//  "CSS-first" config model — theme tokens and the `@theme`
//  block live directly in app/globals.css (see the
//  `@import "tailwindcss"` + `@theme inline { ... }` there).
//  Content scanning is automatic in v4 (no `content` array
//  needed) — it detects files by walking the project.
//
//  This file is kept for:
//    - editor/IDE tooling that still looks for tailwind.config.*
//    - any future need to opt back into JS-based config via
//      an explicit `@config "./tailwind.config.ts";` directive
//      in globals.css (not used currently)
// ─────────────────────────────────────────────────────────────
import type { Config } from "tailwindcss";

const config: Config = {
  // Left mostly empty on purpose — v4 theme customization
  // happens in app/globals.css via the @theme directive.
  theme: {
    extend: {},
  },
};

export default config;
