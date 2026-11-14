// The portal's own MCP connection. Everything live comes through here: JSON-RPC `tools/call` to the
// Account Quest MCP, one call at a time, never faster than one a minute (the token's limit).
// A scheduler picks the most overdue source on each tick; results live in memory, and the committed
// snapshot is used only until the first live answer for a source arrives.
import "server-only";
import fs from "node:fs";
import path from "node:path";
import { readSnapshot } from "./aq";

export const MCP_URL = "https://questathon.aihackerscollective.com/api/public/mcp";
const MIN_GAP_MS = 61_000;

export interface SourceDef { key: string; tool: string; args: Record<string, unknown>; everySec: number; snapshot: string; label: string }
export interface SourceState { key: string; tool: string; label: string; everySec: number; source: "live" | "snapshot" | "none"; fetchedAt: string | null; changedAt: string | null; lastError: string | null; nextDueAt: string | null; bytes: number }
export interface CallLog { at: string; tool: string; args: string; ok: boolean; ms: number; note: string }
export interface ChangeEntry { at: string; source: string; tool: string; lines: string[] }

interface Store {
  data: Record<string, unknown>;
  meta: Record<string, { fetchedAt: number | null; changedAt: number | null; lastError: string | null; hash: string; bytes: number }>;
  log: CallLog[];
  changes: ChangeEntry[];
  writeReservedUntil?: number;
  lastCallAt: number;
  version: number;
  extraPacks: string[];
  inflight: Promise<void> | null;
  bootAt: number;
}

const g = globalThis as unknown as { __aqStore?: Store };
const store: Store = (g.__aqStore ??= { data: {}, meta: {}, log: [], changes: [], lastCallAt: 0, version: 1, extraPacks: [], inflight: null, bootAt: Date.now() });
store.changes ??= [];

export function sources(): SourceDef[] {
  const base: SourceDef[] = [
    { key: "signals", tool: "get_signals", args: {}, everySec: 60, snapshot: "signals.json", label: "Live events" },
    { key: "me", tool: "whoami", args: {}, everySec: 180, snapshot: "me.json", label: "Who am I & new accounts" },
    { key: "new_H", tool: "get_new_account", args: { account: "H" }, everySec: 300, snapshot: "new_H.json", label: "New account H" },
    { key: "new_K", tool: "get_new_account", args: { account: "K" }, everySec: 300, snapshot: "new_K.json", label: "New account K" },
    { key: "accounts", tool: "get_my_accounts", args: {}, everySec: 300, snapshot: "export.json", label: "Accounts, people, facts, deals" },
    { key: "notes", tool: "list_notes", args: {}, everySec: 300, snapshot: "notes.json", label: "Notes written back" },
    { key: "pack_A", tool: "get_all_paperwork", args: { account: "A" }, everySec: 900, snapshot: "pack_A.json", label: "Paperwork, account A" },
    { key: "pack_B", tool: "get_all_paperwork", args: { account: "B" }, everySec: 900, snapshot: "pack_B.json", label: "Paperwork, account B" },
    { key: "feature_requests", tool: "get_feature_requests", args: {}, everySec: 3600, snapshot: "feature_requests.json", label: "Feature request log" },
  ];
  for (const id of store.extraPacks) base.push({ key: `pack_${id}`, tool: "get_all_paperwork", args: { account: id }, everySec: 900, snapshot: `pack_${id}.json`, label: `Paperwork, account ${id}` });
  // Data-room files the player holds (e.g. the flight log by force), pulled with get_file.
  const exp = (store.data["accounts"] ?? readSnapshot("export.json")) as { files?: { id: string; title: string }[] } | null;
  for (const f of exp?.files ?? []) base.push({ key: `file_${f.id}`, tool: "get_file", args: { id: f.id }, everySec: 3600, snapshot: `file_${f.id}.json`, label: `File: ${f.title}` });
  const me = (store.data["me"] ?? readSnapshot("me.json")) as { new_accounts?: (string | { id?: string; account?: string })[]; pack?: { account: string; open?: boolean }[] } | null;
  const newIds = new Set<string>(["H", "K"]);
  for (const x of me?.new_accounts ?? []) {
    const id = typeof x === "string" ? x : (x?.id ?? x?.account ?? "");
    if (id && /^[A-Z]$/.test(id)) newIds.add(id);
  }
  for (const id of newIds) {
    if (!base.some((b) => b.key === `new_${id}`)) base.push({ key: `new_${id}`, tool: "get_new_account", args: { account: id }, everySec: 300, snapshot: `new_${id}.json`, label: `New account ${id}` });
    const rawNew = (store.data[`new_${id}`] ?? readSnapshot(`new_${id}.json`)) as { files?: { id: string; title: string }[]; account?: { files?: { id: string; title: string }[] }; accounts?: { files?: { id: string; title: string }[] }[] } | null;
    const newFiles = rawNew?.files ?? rawNew?.account?.files ?? rawNew?.accounts?.flatMap((a) => a.files ?? []) ?? [];
    for (const f of newFiles) {
      if (!base.some((b) => b.key === `file_${f.id}`)) {
        base.push({ key: `file_${f.id}`, tool: "get_new_account_file", args: { account: id, file_id: f.id }, everySec: 3600, snapshot: `file_${f.id}.json`, label: `File (${id}): ${f.title}` });
      }
    }
  }
  for (const p of me?.pack ?? []) {
    if (p.open && p.account !== "A" && p.account !== "B" && !base.some((b) => b.key === `pack_${p.account}`)) {
      base.push({ key: `pack_${p.account}`, tool: "get_all_paperwork", args: { account: p.account }, everySec: 900, snapshot: `pack_${p.account}.json`, label: `Paperwork, account ${p.account}` });
    }
  }
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

// Fields that change on every call (timestamps) must not count as "new data".
const VOLATILE = new Set(["exported_at", "minute", "generated_at", "now", "fetched_at"]);
const stable = (d: unknown) => JSON.stringify(d, (k, v) => (VOLATILE.has(k) ? undefined : v));

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
  // A write (write_note) is waiting for the next slot: let it have it.
  if (!force && store.writeReservedUntil && Date.now() < store.writeReservedUntil) return { called: null, changed: false };
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
      const h = hashOf(stable(data));
      const snapJson = stable(readSnapshot(pick.snapshot) ?? null);
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
      if (changed) {
        const prev = pick.key in store.data ? store.data[pick.key] : readSnapshot(pick.snapshot);
        const lines = diffLines(pick.key, prev, data);
        store.changes.unshift({ at: new Date().toISOString(), source: pick.label, tool: pick.tool, lines: lines.length ? lines : ["Content changed (no headline difference)."] });
        store.changes.length = Math.min(store.changes.length, 60);
      }
      store.data[pick.key] = data;
      persistSnapshot(pick.snapshot, data);
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

/** Hold the next free slot for a waiting write_note. */
export function reserveForWrite(sec: number) {
  store.writeReservedUntil = Date.now() + sec * 1000;
}

export function noteWritten() {
  store.writeReservedUntil = 0;
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
    changes: store.changes,
  };
}
export type SyncStatus = ReturnType<typeof syncStatus>;

/* ---------- what changed between two answers of the same tool, in plain words ---------- */
type Acc = { id: string; name: string; stakeholders?: { id: string; name: string; relationship: string }[]; facts?: { id: string; status: string }[]; opportunities?: { id: string; title: string; stage: string; worth_up_to: number | null }[]; offers?: { id: string; status: string }[] };
function diffLines(key: string, prev: unknown, next: unknown): string[] {
  const out: string[] = [];
  try {
    if (key === "signals") {
      const before = ((prev as { signals?: { id: string; title: string }[] })?.signals ?? []);
      const after = ((next as { signals?: { id: string; title: string; dated: string }[] })?.signals ?? []);
      const was = new Set(before.map((x) => x.id));
      const now = new Set(after.map((x) => x.id));
      if (before.length !== after.length) out.push(`Live events reported: ${before.length} → ${after.length}`);
      for (const sg of after) if (!was.has(sg.id)) out.push(`New live event ${sg.id} (${sg.dated}): ${sg.title}`);
      for (const sg of before) if (!now.has(sg.id)) out.push(`No longer reported: ${sg.id} (${sg.title})`);
    } else if (key === "accounts") {
      const pa = ((prev as { accounts?: Acc[] })?.accounts ?? []);
      for (const a of (next as { accounts?: Acc[] })?.accounts ?? []) {
        const b = pa.find((x) => x.id === a.id);
        if (!b) { out.push(`New account ${a.id}: ${a.name}`); continue; }
        for (const o of a.opportunities ?? []) {
          const ob = (b.opportunities ?? []).find((x) => x.id === o.id);
          if (!ob) out.push(`${a.id}: new deal ${o.id} (${o.title}), stage ${o.stage}`);
          else if (ob.stage !== o.stage) out.push(`${a.id}: deal ${o.id} moved ${ob.stage} → ${o.stage}`);
          else if (ob.worth_up_to !== o.worth_up_to) out.push(`${a.id}: deal ${o.id} worth ${ob.worth_up_to ?? "n/a"} → ${o.worth_up_to ?? "n/a"}`);
        }
        for (const p of a.stakeholders ?? []) {
          const pb = (b.stakeholders ?? []).find((x) => x.id === p.id);
          if (!pb) out.push(`${a.id}: new person ${p.name} (${p.relationship})`);
          else if (pb.relationship !== p.relationship) out.push(`${a.id}: ${p.name} ${pb.relationship} → ${p.relationship}`);
        }
        const nf = (a.facts ?? []).length - (b.facts ?? []).length;
        if (nf) out.push(`${a.id}: ${nf > 0 ? "+" : ""}${nf} facts`);
        for (const f of a.facts ?? []) { const fb = (b.facts ?? []).find((x) => x.id === f.id); if (fb && fb.status !== f.status) out.push(`${a.id}: fact ${f.id} ${fb.status} → ${f.status}`); }
        for (const o of a.offers ?? []) { const ob = (b.offers ?? []).find((x) => x.id === o.id); if (!ob) out.push(`${a.id}: new offer ${o.id} (${o.status})`); else if (ob.status !== o.status) out.push(`${a.id}: offer ${o.id} ${ob.status} → ${o.status}`); }
      }
    } else if (key === "notes") {
      const n0 = ((prev as { notes?: unknown[] })?.notes ?? []).length, n1 = ((next as { notes?: unknown[] })?.notes ?? []).length;
      if (n1 !== n0) out.push(`Notes in the game: ${n0} → ${n1}`);
    } else if (key.startsWith("pack_")) {
      const r0 = ((prev as { records?: { path: string; text?: string }[] })?.records ?? []);
      const r1 = ((next as { records?: { path: string; text?: string }[] })?.records ?? []);
      const p0 = new Map(r0.map((r) => [r.path, (r.text ?? "").length]));
      for (const r of r1) {
        if (!p0.has(r.path)) out.push(`New record ${r.path}`);
        else if ((r.text ?? "").length !== p0.get(r.path)) out.push(`Record updated: ${r.path}`);
      }
    }
  } catch {}
  return out.slice(0, 12);
}

/** Local dev only (PERSIST_SNAPSHOT=1): write each live answer back to data/snapshot, so the committed
 * cold-start fallback is as fresh as the last pull. On Vercel the file system is read-only, so this is off. */
function persistSnapshot(file: string, data: unknown) {
  if (process.env.NODE_ENV === "production" && process.env.PERSIST_SNAPSHOT !== "1") return;
  try {
    fs.writeFileSync(path.join(process.cwd(), "data", "snapshot", file), JSON.stringify(data, null, 1));
  } catch {}
}
