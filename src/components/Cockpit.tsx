"use client";
// Cockpit mode: a full-screen, live command view of the whole book, like the mission-control cockpit of
// the drone console. Gauges per account, renewal countdowns, next moves on timers, red risks and the live
// MCP feed. It updates by itself as the portal pulls new data. Esc or the X closes it.
import { useEffect } from "react";
import clsx from "clsx";
import { PlugZap, X } from "lucide-react";
import type { CrmView } from "@/lib/types";
import type { SyncStatus } from "@/lib/sync";
import { fmtDate, fmtMoney } from "./ui";
import { useNow } from "./McpPanel";
import { useOps } from "./ops";

export function Cockpit({ crm, sync, onClose, onSync }: { crm: CrmView; sync: SyncStatus; onClose: () => void; onSync: () => void }) {
  const now = useNow();
  const ops = useOps();
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "s") onSync(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose, onSync]);

  const live = sync.sources.some((s) => s.source === "live");
  const moves = crm.accounts.flatMap((a) => a.moves.map((m) => ({ ...ops.apply(m), acc: a.id }))).filter((m) => m.status === "open").sort((x, y) => x.due.localeCompare(y.due) || y.score.total - x.score.total).slice(0, 6);
  const reds = crm.accounts.flatMap((a) => a.risks.map((r) => ({ ...r, acc: a.id }))).filter((r) => r.level === "red").sort((x, y) => (x.turnsBadOn ?? "9999").localeCompare(y.turnsBadOn ?? "9999")).slice(0, 6);
  const feed = [
    ...sync.changes.slice(0, 6).map((c) => ({ at: c.at, tag: c.tool, text: c.lines[0] ?? "changed" })),
    ...sync.log.slice(0, 6).map((l) => ({ at: l.at, tag: l.tool, text: l.ok ? `pulled · ${l.note || "ok"}` : `failed · ${l.note.slice(0, 60)}` })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
  const days = (iso: string) => Math.round((new Date(iso + "T00:00:00Z").getTime() - new Date(crm.asOf + "T00:00:00Z").getTime()) / 86_400_000);

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#060607] p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-4 border-b border-line pb-3">
        <div className="flex items-center gap-2"><span className="h-3 w-3 bg-accent" /><span className="mono text-sm uppercase tracking-[0.25em]">Account Desk · Cockpit</span></div>
        <span className="mono text-xs text-muted">account date {fmtDate(crm.asOf)}</span>
        <span className={clsx("mono flex items-center gap-1.5 border px-2 py-0.5 text-[11px] uppercase", live ? "border-green/40 text-green" : "border-amber/40 text-amber")}>
          <PlugZap size={12} className={live ? "live-dot" : ""} />{live ? "MCP live" : "MCP connecting"} · {sync.sources.filter((s) => s.source === "live").length}/{sync.sources.length} sources · next call {sync.nextCallInSec > 0 ? `≤${sync.nextCallInSec}s` : "now"}
        </span>
        <span className="mono ml-auto text-2xl tabular-nums text-text">{now ? new Date(now).toLocaleTimeString("en-GB") : "--:--:--"}</span>
        <button onClick={onSync} className="mono border border-line px-2 py-1 text-[10.5px] uppercase tracking-wider text-muted hover:border-accent hover:text-accent">Sync (s)</button>
        <button onClick={onClose} aria-label="Close cockpit" className="border border-line p-1.5 text-muted hover:text-text"><X size={16} /></button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr_1fr]">
        {/* gauges */}
        <div className="space-y-4">
          {crm.accounts.map((a) => {
            const k = a.kpis;
            const color = k.health.score < 40 ? "var(--red)" : k.health.score < 65 ? "var(--amber)" : "var(--green)";
            return (
              <div key={a.id} className="border border-line bg-panel p-4">
                <div className="label">Account {a.id}</div>
                <div className="truncate text-lg font-semibold">{a.name}</div>
                <div className="mt-3 flex items-center gap-4">
                  <Ring value={k.health.score} color={color} />
                  <div className="space-y-1.5 text-sm">
                    <div><span className="text-dim">Renewal </span><span className="mono">{fmtMoney(k.renewal)}</span></div>
                    <div><span className="text-dim">Countdown </span><span className={clsx("mono text-xl", k.daysToRenewal != null && k.daysToRenewal < 75 ? "text-red" : "text-amber")}>{k.daysToRenewal ?? "-"}</span><span className="text-dim"> days</span></div>
                    <div><span className="text-dim">Docks </span><span className="mono">{k.active}</span><span className="text-dim">/{k.docks} active</span></div>
                  </div>
                </div>
                <div className="mt-3 flex h-2 overflow-hidden bg-white/5">
                  <div style={{ width: `${(k.active / Math.max(k.docks, 1)) * 100}%`, background: "var(--green)" }} />
                  <div style={{ width: `${(k.low / Math.max(k.docks, 1)) * 100}%`, background: "var(--amber)" }} />
                  <div style={{ width: `${(k.dormant / Math.max(k.docks, 1)) * 100}%`, background: "var(--red)" }} />
                </div>
                <div className="mt-1 text-[11px] text-dim">{k.flightsLast4} flights in 4 weeks · was {k.flightsPrev4}</div>
              </div>
            );
          })}
        </div>

        {/* next moves */}
        <div className="border border-line bg-panel p-4">
          <div className="label mb-3">Next moves · on the clock</div>
          <div className="space-y-2">
            {moves.map((m, i) => {
              const left = days(m.due);
              return (
                <div key={m.id} className={clsx("grid grid-cols-[34px_1fr_80px] items-center gap-3 border p-3", i === 0 ? "border-accent/70 bg-[var(--accent-soft)]" : "border-line")}>
                  <span className={clsx("mono flex h-8 w-8 items-center justify-center text-sm", i === 0 ? "bg-accent text-black" : "border border-line text-muted")}>{i + 1}</span>
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-medium">{m.title}</div>
                    <div className="truncate text-xs text-muted">Acct {m.acc} · {m.owner} · moves {m.dealIds.join(", ")}</div>
                  </div>
                  <div className="text-right">
                    <div className={clsx("mono text-2xl tabular-nums", left <= 1 ? "text-red" : left <= 3 ? "text-amber" : "text-text")}>{left <= 0 ? "now" : `${left}d`}</div>
                    <div className="text-[10.5px] text-dim">{fmtDate(m.due)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* risks + live feed */}
        <div className="space-y-4">
          <div className="border border-red/30 bg-panel p-4">
            <div className="label mb-2 !text-red">Red risks</div>
            <div className="space-y-2">
              {reds.map((r) => (
                <div key={r.id} className="flex items-start justify-between gap-3 text-sm">
                  <span className="min-w-0"><span className="mono mr-1.5 text-[10.5px] text-dim">{r.acc}</span>{r.title}</span>
                  <span className={clsx("mono shrink-0 text-xs", r.turnsBadOn && r.turnsBadOn <= crm.asOf ? "text-red" : "text-muted")}>{r.turnsBadOn ? (r.turnsBadOn <= crm.asOf ? "now" : `${days(r.turnsBadOn)}d`) : "?"}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border border-line bg-panel p-4">
            <div className="label mb-2 flex items-center gap-1.5"><PlugZap size={12} className="text-accent" />Live MCP feed</div>
            <div className="space-y-1.5">
              {feed.length === 0 && <div className="text-xs text-muted">Waiting for the first pull…</div>}
              {feed.map((f, i) => (
                <div key={i} className={clsx("grid grid-cols-[62px_110px_1fr] gap-2 text-xs", i === 0 && "flash-new")}>
                  <span className="mono text-dim">{new Date(f.at).toLocaleTimeString("en-GB")}</span>
                  <span className="mono truncate text-accent">{f.tag}</span>
                  <span className="truncate text-text/80">{f.text}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 text-[11px] text-dim">{crm.accounts.reduce((n, a) => n + a.signals.length, 0)} live events merged · data version {sync.version}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Ring({ value, color }: { value: number; color: string }) {
  const r = 34, c = 2 * Math.PI * r;
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0">
      <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
      <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="8" strokeDasharray={`${(value / 100) * c} ${c}`} transform="rotate(-90 44 44)" />
      <text x="44" y="49" textAnchor="middle" className="mono" fontSize="20" fill="var(--text)">{value}</text>
    </svg>
  );
}
