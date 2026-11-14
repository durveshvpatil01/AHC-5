"use client";
// Keeps the page live: polls the portal's /api/crm every 20 s and swaps in new data in place when the
// MCP connection brings something new. "Sync now" asks the server to call get_signals immediately.
import { useCallback, useEffect, useRef, useState } from "react";
import type { CrmView } from "@/lib/types";
import type { SyncStatus } from "@/lib/sync";
import { Desk } from "./Desk";

export interface LiveState { crm: CrmView; version: number; sync: SyncStatus }

const POLL_MS = 20_000;

export function LiveDesk({ initial }: { initial: LiveState }) {
  const [state, setState] = useState<LiveState>(initial);
  const [toast, setToast] = useState<string | null>(null);
  const [newSignalIds, setNewSignalIds] = useState<Set<string>>(() => new Set());
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [lastPoll, setLastPoll] = useState<string | null>(null);
  const known = useRef<Set<string>>(new Set(initial.crm.accounts.flatMap((a) => a.signals.map((s) => s.id))));
  const ver = useRef(initial.version);

  const apply = useCallback((j: { same: boolean; version: number; crm?: CrmView; sync: SyncStatus }) => {
    setLastPoll(new Date().toISOString());
    if (j.same || !j.crm) {
      setState((s) => ({ ...s, sync: j.sync }));
      return;
    }
    const fresh = j.crm.accounts.flatMap((a) => a.signals).filter((s) => !known.current.has(s.id));
    fresh.forEach((s) => known.current.add(s.id));
    if (fresh.length) setNewSignalIds((prev) => new Set([...prev, ...fresh.map((s) => s.id)]));
    const changed = j.sync.sources.filter((s) => s.changedAt && Date.now() - new Date(s.changedAt).getTime() < 120_000).map((s) => s.label);
    setToast(fresh.length ? `New live event via MCP: ${fresh.map((s) => s.title).join(" · ")}` : `Updated from the MCP: ${changed.join(", ") || "account data"}`);
    ver.current = j.version;
    setState({ crm: j.crm, version: j.version, sync: j.sync });
  }, []);

  const poll = useCallback(async () => {
    try {
      const r = await fetch(`/api/crm?v=${ver.current}`, { cache: "no-store" });
      apply(await r.json());
    } catch {}
  }, [apply]);

  useEffect(() => {
    const first = setTimeout(poll, 2_000);
    const h = setInterval(poll, POLL_MS);
    const vis = () => document.visibilityState === "visible" && poll();
    document.addEventListener("visibilitychange", vis);
    return () => { clearTimeout(first); clearInterval(h); document.removeEventListener("visibilitychange", vis); };
  }, [poll]);

  const syncNow = useCallback(async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const r = await fetch("/api/sync?source=signals", { method: "POST" });
      const j = await r.json();
      if (!j.ok) setSyncMsg(j.error);
      else setSyncMsg(j.changed ? "New data arrived." : "Checked get_signals: nothing new.");
      await poll();
    } catch (e) {
      setSyncMsg(String(e));
    } finally {
      setSyncing(false);
    }
  }, [poll]);

  return (
    <Desk
      crm={state.crm}
      sync={state.sync}
      toast={toast}
      onDismissToast={() => setToast(null)}
      newSignalIds={newSignalIds}
      onSync={syncNow}
      syncing={syncing}
      syncMsg={syncMsg}
      lastPoll={lastPoll}
      pollEverySec={POLL_MS / 1000}
    />
  );
}
