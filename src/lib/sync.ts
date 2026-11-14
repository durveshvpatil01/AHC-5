// The portal's own MCP connection. Everything live comes through here: JSON-RPC `tools/call` to the
// Account Quest MCP, one call at a time, never faster than one a minute (the token's limit).
// A scheduler picks the most overdue source on each tick; results live in memory, and the committed
// snapshot is used only until the first live answer for a source arrives.
import "server-only";
import { readSnapshot } from "./aq";

export const MCP_URL = "https://questathon.aihackerscollective.com/api/public/mcp";
const MIN_GAP_MS = 61_000;

export interface SourceDef { key: string; tool: string; args: Record<string, unknown>; everySec: number; snapshot: string; label: string }
export interface SourceState { key: string; tool: string; label: string; everySec: number; source: "live" | "snapshot" | "none"; fetchedAt: string | null; changedAt: string | null; lastError: string | null; nextDueAt: string | null; bytes: number }
export interface CallLog { at: string; tool: string; args: string; ok: boolean; ms: number; note: string }

interface Store {
  data: Record<string, unknown>;
  meta: Record<string, { fetchedAt: number | null; changedAt: number | null; lastError: string | null; hash: string; bytes: number }>;
  log: CallLog[];
  lastCallAt: number;
  version: number;
  extraPacks: string[];
  inflight: Promise<void> | null;
  bootAt: number;
}

const g = globalThis as unknown as { __aqStore?: Store };
const store: Store = (g.__aqStore ??= { data: {}, meta: {}, log: [], lastCallAt: 0, version: 1, extraPacks: [], inflight: null, bootAt: Date.now() });

export function sources(): SourceDef[] {
  const base: SourceDef[] = [
    { key: "signals", tool: "get_signals", args: {}, everySec: 60, snapshot: "signals.json", label: "Live events" },
    { key: "accounts", tool: "get_my_accounts", args: {}, everySec: 300, snapshot: "export.json", label: "Accounts, people, facts, deals" },
    { key: "notes", tool: "list_notes", args: {}, everySec: 300, snapshot: "notes.json", label: "Notes written back" },
    { key: "pack_A", tool: "get_all_paperwork", args: { account: "A" }, everySec: 3600, snapshot: "pack_A.json", label: "Paperwork, account A" },
    { key: "pack_B", tool: "get_all_paperwork", args: { account: "B" }, everySec: 3600, snapshot: "pack_B.json", label: "Paperwork, account B" },
  ];
  for (const id of store.extraPacks) base.push({ key: `pack_${id}`, tool: "get_all_paperwork", args: { account: id }, everySec: 3600, snapshot: `pack_${id}.json`, label: `Paperwork, account ${id}` });
  return base;
}

/** One JSON-RPC tools/call to the MCP. Server-side only: the token never reaches the browser. */
export async function mcpCall<T = unknown>(tool: string, args: Record<string, unknown> = {}): Promise<T> {
  const token = process.env.AQ_TOKEN;
  if (!token) throw new Error("AQ_TOKEN is not set on the server");
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: `Bearer ${token}` },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method: "tools/call", params: { name: tool, arguments: args } }),
    cache: "no-store",
  });
  const raw = await res.text();
  let body: { result?: { isError?: boolean; content?: { text: string }[] }; error?: { message: string } };
  try {
    body = JSON.parse(raw);
  } catch {
    const line = raw.split("\n").filter((l) => l.startsWith("data:")).pop();
    body = line ? JSON.parse(line.slice(5)) : { error: { message: `HTTP ${res.status}: ${raw.slice(0, 160)}` } };
  }
  if (body.error || body.result?.isError) throw new Error(body.error?.message ?? body.result?.content?.[0]?.text ?? `HTTP ${res.status}`);
  const text = body.result!.content![0].text;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

function hashOf(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return String(h);
}

function record(entry: CallLog) {
  store.log.unshift(entry);
  store.log.length = Math.min(store.log.length, 40);
}

export function secondsUntilNextCall() {
  return Math.max(0, Math.ceil((store.lastCallAt + MIN_GAP_MS - Date.now()) / 1000));
}

/** Run one guarded MCP call (used by the scheduler and by write_note). */
export async function guardedCall<T>(tool: string, args: Record<string, unknown>): Promise<T> {
  const wait = secondsUntilNextCall();
  if (wait > 0) throw new Error(`Rate limit: next MCP call allowed in ${wait}s`);
  store.lastCallAt = Date.now();
  const t0 = Date.now();
  try {
    const r = await mcpCall<T>(tool, args);
    record({ at: new Date().toISOString(), tool, args: JSON.stringify(args), ok: true, ms: Date.now() - t0, note: "" });
    return r;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    record({ at: new Date().toISOString(), tool, args: JSON.stringify(args), ok: false, ms: Date.now() - t0, note: msg.slice(0, 140) });
    throw e;
  }
}

function dueScore(def: SourceDef, now: number) {
  const m = store.meta[def.key];
  if (!m?.fetchedAt) return Number.POSITIVE_INFINITY;
  const age = (now - m.fetchedAt) / 1000;
  return age >= def.everySec ? age / def.everySec : 0;
}

/** Scheduler tick: if the minute has passed, call the most overdue source. At most one call per tick. */
export async function tick(force?: string): Promise<{ called: string | null; changed: boolean }> {
  if (store.inflight) {
    await store.inflight;
    return { called: null, changed: false };
  }
  if (!process.env.AQ_TOKEN || secondsUntilNextCall() > 0) return { called: null, changed: false };
  const now = Date.now();
  const defs = sources();
  const pick = force ? defs.find((d) => d.key === force) : defs.map((d) => ({ d, s: dueScore(d, now) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s)[0]?.d;
  if (!pick) return { called: null, changed: false };
  let changed = false;
  store.inflight = (async () => {
    const meta = (store.meta[pick.key] ??= { fetchedAt: null, changedAt: null, lastError: null, hash: "", bytes: 0 });
    try {
      const data = await guardedCall<unknown>(pick.tool, pick.args);
      const json = JSON.stringify(data);
      const h = hashOf(json);
      const snapJson = JSON.stringify(readSnapshot(pick.snapshot) ?? null);
      const prevHash = meta.hash || hashOf(snapJson);
      meta.fetchedAt = Date.now();
      meta.lastError = null;
      meta.bytes = json.length;
      if (h !== prevHash) {
        changed = true;
        meta.changedAt = Date.now();
        store.version++;
        store.log[0].note = meta.hash ? "changed" : h === hashOf(snapJson) ? "same as snapshot" : "newer than snapshot";
      } else store.log[0].note = "no change";
      meta.hash = h;
      store.data[pick.key] = data;
      if (pick.key === "accounts") {
        const ids = ((data as { accounts?: { id: string }[] }).accounts ?? []).map((a) => a.id).filter((id) => id !== "A" && id !== "B" && /^[A-Z]$/.test(id));
        for (const id of ids) if (!store.extraPacks.includes(id)) store.extraPacks.push(id);
      }
    } catch (e) {
      meta.lastError = e instanceof Error ? e.message : String(e);
    }
  })();
  await store.inflight;
  store.inflight = null;
  return { called: pick.tool, changed };
}

/** Current value for a source: the live answer if we have one, else the committed snapshot. */
export function getSource<T>(key: string, snapshot: string): { data: T | null; source: "live" | "snapshot" | "none"; fetchedAt: string | null } {
  if (key in store.data) return { data: store.data[key] as T, source: "live", fetchedAt: new Date(store.meta[key].fetchedAt!).toISOString() };
  const snap = readSnapshot<T>(snapshot);
  return { data: snap, source: snap ? "snapshot" : "none", fetchedAt: null };
}

export function noteWritten() {
  const m = store.meta["notes"];
  if (m) m.fetchedAt = 0; // make notes the most overdue source
}

export function syncStatus() {
  const now = Date.now();
  const states: SourceState[] = sources().map((d) => {
    const m = store.meta[d.key];
    const live = d.key in store.data;
    return {
      key: d.key, tool: d.tool, label: d.label, everySec: d.everySec,
      source: live ? "live" : readSnapshot(d.snapshot) ? "snapshot" : "none",
      fetchedAt: m?.fetchedAt ? new Date(m.fetchedAt).toISOString() : null,
      changedAt: m?.changedAt ? new Date(m.changedAt).toISOString() : null,
      lastError: m?.lastError ?? null,
      nextDueAt: m?.fetchedAt ? new Date(Math.max(m.fetchedAt + d.everySec * 1000, store.lastCallAt + MIN_GAP_MS)).toISOString() : null,
      bytes: m?.bytes ?? 0,
    };
  });
  return {
    endpoint: MCP_URL,
    transport: "JSON-RPC 2.0 · tools/call · Bearer token (server-side env var)",
    tokenSet: !!process.env.AQ_TOKEN,
    version: store.version,
    serverUpSince: new Date(store.bootAt).toISOString(),
    nextCallInSec: secondsUntilNextCall(),
    now: new Date(now).toISOString(),
    sources: states,
    log: store.log,
  };
}
export type SyncStatus = ReturnType<typeof syncStatus>;
