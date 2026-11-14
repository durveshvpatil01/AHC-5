import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The committed snapshot is read at runtime with fs; make sure Vercel ships it with the functions.
  outputFileTracingIncludes: {
    "/": ["./data/snapshot/**/*"],
    "/api/live": ["./data/snapshot/**/*"],
    "/api/notes": ["./data/snapshot/**/*"],
  },
};

export default nextConfig;
