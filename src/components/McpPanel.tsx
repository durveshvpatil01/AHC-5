"use client";
// The portal's MCP connection, made visible: endpoint, what each source is, when it was last pulled,
// whether it changed, when the next pull is due, and the raw call log.
import { useEffect, useState } from "react";
import clsx from "clsx";
import { CheckCircle2, CircleAlert, Loader2, PlugZap, RefreshCw, X } from "lucide-react";
import type { SyncStatus } from "@/lib/sync";
import { Pill } from "./ui";

const ago = (iso: string | null, now: number) => {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.floor(s / 60)}m ${s % 60}s ago` : `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ago`;
};
const until = (iso: string | null, now: number) => {
  if (!iso) return "now";
  const s = Math.round((new Date(iso).getTime() - now) / 1000);
  return s <= 0 ? "due" : s < 60 ? `in ${s}s` : `in ${Math.floor(s / 60)}m ${s % 60}s`;
};

export function useNow(ms = 1000) {
  // 0 until mounted, so server and first client render match (no hydration mismatch).
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const h = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(h);
  }, [ms]);
  return now;
}

export function McpPanel({ sync, onSync, syncing, syncMsg, lastPoll, pollEverySec, onClose }: { sync: SyncStatus; onSync: () => void; syncing: boolean; syncMsg: string | null; lastPoll: string | null; pollEverySec: number; onClose: () => void }) {
  const now = useNow();
  const liveCount = sync.sources.filter((s) => s.source === "live").length;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <aside className="h-full w-full max-w-[620px] overflow-y-auto border-l border-line bg-panel p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="label flex items-center gap-1.5"><PlugZap size={12} className="text-accent" /> MCP connection</div>
            <h3 className="mt-1 text-lg font-semibold">This portal pulls its own data from the Account Quest MCP</h3>
            <p className="mt-1 text-xs text-muted">A server-side scheduler makes one call a minute (the token&apos;s limit), always to the most overdue source. New data shows up here, and on every page, without a reload.</p>
          </div>
          <button aria-label="Close" onClick={onClose} className="rounded border border-line p-1.5 text-muted hover:text-text"><X size={16} /></button>
        </div>

        <div className="mt-4 grid gap-2 border border-line bg-bg p-3 text-xs">
          <Row k="Endpoint" v={<span className="mono break-all text-text">{sync.endpoint}</span>} />
          <Row k="Transport" v={sync.transport} />
          <Row k="Token" v={sync.tokenSet ? <span className="text-green">set on the server (never sent to the browser)</span> : <span className="text-red">missing: set AQ_TOKEN</span>} />
          <Row k="Sources live" v={`${liveCount} of ${sync.sources.length} (others served from the stored snapshot until their first pull)`} />
          <Row k="Next MCP call" v={sync.nextCallInSec > 0 ? `allowed in ${Math.max(0, sync.nextCallInSec - Math.round((now - new Date(sync.now).getTime()) / 1000))}s` : "allowed now"} />
          <Row k="This page" v={`checks the portal every ${pollEverySec}s · last check ${ago(lastPoll, now)} · data version ${sync.version}`} />
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button onClick={onSync} disabled={syncing} className="mono flex items-center gap-1.5 border border-accent bg-accent px-3 py-1.5 text-[11px] uppercase tracking-wider text-black disabled:opacity-50">
            {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Sync live events now
          </button>
          {syncMsg && <span className="text-xs text-muted">{syncMsg}</span>}
        </div>

        <div className="label mt-6">Sources</div>
        <div className="mt-2 divide-y divide-line border border-line">
          {sync.sources.map((s) => (
            <div key={s.key} className="grid grid-cols-[1fr_auto] gap-2 p-3 text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="mono text-text">{s.tool}</span>
                  <Pill level={s.source === "live" ? "green" : s.source === "snapshot" ? "amber" : "grey"}>{s.source}</Pill>
                  {s.changedAt && now - new Date(s.changedAt).getTime() < 10 * 60_000 && <Pill level="red">changed {ago(s.changedAt, now)}</Pill>}
                </div>
                <div className="mt-0.5 text-muted">{s.label} · every {s.everySec >= 3600 ? `${s.everySec / 3600}h` : s.everySec >= 60 ? `${s.everySec / 60} min` : `${s.everySec}s`}</div>
                {s.lastError && <div className="mt-0.5 text-red">{s.lastError}</div>}
              </div>
              <div className="text-right text-muted">
                <div>{s.source === "snapshot" ? "saved copy (fallback)" : `pulled ${ago(s.fetchedAt, now)}`}</div>
                <div>next {s.fetchedAt ? until(s.nextDueAt, now) : "soon"}</div>
                {s.bytes > 0 && <div className="mono text-dim">{(s.bytes / 1024).toFixed(1)} KB</div>}
              </div>
            </div>
          ))}
        </div>

        <div className="label mt-6">Call log (this server)</div>
        <div className="mt-2 border border-line">
          {sync.log.length === 0 && <div className="p-3 text-xs text-muted">No MCP calls yet on this server instance. The first one happens on the next page check.</div>}
          {sync.log.map((l, i) => (
            <div key={i} className={clsx("grid grid-cols-[70px_1fr_auto] items-center gap-2 border-b border-line/60 px-3 py-1.5 text-xs last:border-b-0", i === 0 && "flash-new")}>
              <span className="mono text-dim">{new Date(l.at).toLocaleTimeString("en-GB")}</span>
              <span className="mono truncate">
                {l.ok ? <CheckCircle2 size={11} className="mr-1 inline text-green" /> : <CircleAlert size={11} className="mr-1 inline text-red" />}
                {l.tool}{l.args !== "{}" ? ` ${l.args}` : ""} <span className="text-muted">{l.note}</span>
              </span>
              <span className="mono text-dim">{l.ms} ms</span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2">
      <span className="text-dim">{k}</span>
      <span className="text-muted">{v}</span>
    </div>
  );
}
