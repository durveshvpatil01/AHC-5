// Server-only data access. The token never leaves the server.
// Strategy: committed snapshot (data/snapshot) is the store; live endpoints are refreshed through the
// Vercel Data Cache (unstable_cache) on staggered intervals so we stay under 1 call/min per token.
import "server-only";
import { unstable_cache } from "next/cache";
import fs from "node:fs";
import path from "node:path";

const BASE = "https://questathon.aihackerscollective.com/api/public/v1";
const SNAP = path.join(process.cwd(), "data", "snapshot");

export type Fetched<T> = { data: T; source: "live" | "snapshot"; fetchedAt: string };

export function readSnapshot<T = unknown>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(SNAP, file), "utf8")) as T;
  } catch {
    return null;
  }
}

function snapshotTime(file: string): string {
  try {
    return fs.statSync(path.join(SNAP, file)).mtime.toISOString();
  } catch {
    return new Date(0).toISOString();
  }
}

async function rest<T>(p: string, init?: RequestInit): Promise<T> {
  const token = process.env.AQ_TOKEN;
  if (!token) throw new Error("AQ_TOKEN not set");
  const r = await fetch(BASE + p, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${t.slice(0, 160)}`);
  return JSON.parse(t) as T;
}

function cached<T>(key: string, p: string, revalidate: number) {
  return unstable_cache(
    async () => ({ data: await rest<T>(p), fetchedAt: new Date().toISOString() }),
    ["aq", key],
    { revalidate, tags: ["aq", `aq-${key}`] },
  );
}

// Staggered intervals: signals change most; the rest rarely.
const live = {
  signals: cached<unknown>("signals", "/signals", 60),
  export: cached<unknown>("export", "/export", 420),
  notes: cached<unknown>("notes", "/notes", 300),
};

async function withFallback<T>(fn: () => Promise<{ data: unknown; fetchedAt: string }>, file: string): Promise<Fetched<T>> {
  try {
    const r = await fn();
    return { data: r.data as T, source: "live", fetchedAt: r.fetchedAt };
  } catch {
    return { data: readSnapshot<T>(file) as T, source: "snapshot", fetchedAt: snapshotTime(file) };
  }
}

export const getSignals = <T>() => withFallback<T>(live.signals, "signals.json");
export const getExport = <T>() => withFallback<T>(live.export, "export.json");
export const getNotes = <T>() => withFallback<T>(live.notes, "notes.json");

export async function writeNote(body: { account?: string; kind?: string; title?: string; text: string }) {
  return rest<unknown>("/notes", { method: "POST", body: JSON.stringify(body) });
}
