// Server-only access to the committed snapshot (data/snapshot), the fallback store used until the
// portal's own MCP connection (src/lib/sync.ts) has a live answer for a source.
import "server-only";
import fs from "node:fs";
import path from "node:path";

const SNAP = path.join(process.cwd(), "data", "snapshot");

export function readSnapshot<T = unknown>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(SNAP, file), "utf8")) as T;
  } catch {
    return null;
  }
}
