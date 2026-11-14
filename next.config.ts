import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Separate build folders let two dev servers (Claude Code + Antigravity) run side by side.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // The committed snapshot is read at runtime with fs; make sure Vercel ships it with the functions.
  outputFileTracingIncludes: {
    "/": ["./data/snapshot/**/*"],
    "/api/crm": ["./data/snapshot/**/*"],
    "/api/sync": ["./data/snapshot/**/*"],
    "/api/notes": ["./data/snapshot/**/*"],
    "/api/copilot": ["./data/snapshot/**/*"],
  },
};

export default nextConfig;
