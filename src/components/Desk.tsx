"use client";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { PlugZap, RefreshCw, Loader2 } from "lucide-react";
import type { CrmView } from "@/lib/types";
import type { SyncStatus } from "@/lib/sync";
import { CiteProvider, fmtDate } from "./ui";
import { Portfolio } from "./Portfolio";
import { Account } from "./Account";
import { McpPanel, useNow } from "./McpPanel";

type Tab = string; // "P" = portfolio, otherwise an account id

export function Desk({ crm, sync, toast, onDismissToast, newSignalIds, onSync, syncing, syncMsg, lastPoll, pollEverySec }: {
  crm: CrmView; sync: SyncStatus; toast: string | null; onDismissToast: () => void; newSignalIds: Set<string>;
  onSync: () => void; syncing: boolean; syncMsg: string | null; lastPoll: string | null; pollEverySec: number;
}) {
  const [tab, setTab] = useState<Tab>("P");
  const [panel, setPanel] = useState(false);
  const now = useNow();

  useEffect(() => {
    try {
      const t = localStorage.getItem("desk-tab") as Tab | null;
      if (t && (t === "P" || crm.accounts.some((a) => a.id === t))) setTab(t);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try { localStorage.setItem("desk-tab", tab); } catch {}
  }, [tab]);

  const current = crm.accounts.find((a) => a.id === tab);
  const shortName = (n: string) => n.replace(/(Industrial Group|Police Alliance|Group|Ltd|Inc)/g, "").trim();
  const liveSources = sync.sources.filter((x) => x.source === "live").length;
  const live = liveSources > 0;
  const lastCall = sync.log[0];
  const lastCallAgo = lastCall ? Math.max(0, Math.round((now - new Date(lastCall.at).getTime()) / 1000)) : null;

  return (
    <CiteProvider sources={crm.sources}>
      <div className="min-h-dvh flex flex-col">
        <header className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 md:px-6">
            <div className="flex items-center gap-2.5">
              <Logo />
              <div className="leading-tight">
                <div className="text-[15px] font-semibold tracking-tight">Account Desk</div>
                <div className="label !text-[9.5px]">FlytBase · Customer success</div>
              </div>
            </div>
            <nav aria-label="Account switcher" className="flex flex-wrap items-center gap-1">
              {([["P", "Portfolio", null] as [string, string, number | null], ...crm.accounts.map((a) => [a.id, shortName(a.name), a.kpis.health.score] as [string, string, number | null])]).map(([k, label, h]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  aria-current={tab === k ? "page" : undefined}
                  className={clsx(
                    "mono flex items-center gap-2 border-b-2 px-2.5 py-2 text-[11.5px] uppercase tracking-[0.12em] transition sm:px-3",
                    tab === k ? "border-accent text-text" : "border-transparent text-muted hover:text-text"
                  )}
                >
                  {k !== "P" && <span className="rounded-sm bg-white/5 px-1 text-[10px] text-muted">{k}</span>}
                  <span>{label}</span>
                  {h != null && (
                    <span className={clsx("rounded-sm px-1 text-[10px]", h < 40 ? "bg-[var(--red-soft)] text-red" : h < 65 ? "bg-[var(--amber-soft)] text-amber" : "bg-[var(--green-soft)] text-green")}>
                      {h}
                    </span>
                  )}
                </button>
              ))}
            </nav>
            <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-muted">
              <span className="hidden items-center gap-1.5 sm:inline-flex">
                <span className="label !text-[9.5px]">Account date</span>
                <span className="mono rounded-sm border border-line bg-panel px-1.5 py-0.5 text-[11px] text-text">{fmtDate(crm.asOf)}</span>
              </span>
              <button
                onClick={() => setPanel(true)}
                title="Open the MCP connection panel"
                className={clsx(
                  "flex items-center gap-1.5 border px-2.5 py-1 transition hover:border-accent",
                  live ? "border-green/35 bg-[var(--green-soft)]/50" : "border-amber/35 bg-[var(--amber-soft)]/40"
                )}
              >
                <PlugZap size={12} className={clsx(live ? "live-dot text-green" : "text-amber")} />
                <span className={clsx("mono text-[11px] font-medium uppercase tracking-wider", live ? "text-green" : "text-amber")}>
                  {live ? "MCP live" : "MCP connecting"}
                </span>
                <span className="mono text-[11px] text-muted">· {crm.sync.signals?.count ?? 0} events</span>
                <span className="mono hidden text-[11px] text-dim md:inline">
                  · {lastCall ? `${lastCall.tool} ${lastCallAgo}s ago` : lastPoll ? "waiting for first call" : "…"}
                </span>
              </button>
              <button onClick={onSync} disabled={syncing} title="Ask the MCP for new live events now" className="mono flex items-center gap-1 border border-line px-2 py-1 text-[10.5px] uppercase tracking-wider text-muted hover:border-accent hover:text-accent disabled:opacity-50">
                {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Sync
              </button>
            </div>
          </div>
        </header>

        {syncMsg && !panel && (
          <div className="mx-auto w-full max-w-[1400px] px-4 pt-2 text-xs text-muted md:px-6">{syncMsg}</div>
        )}
        {toast && (
          <div className="mx-auto w-full max-w-[1400px] px-4 pt-3 md:px-6">
            <div role="status" className="flash-new flex items-center justify-between gap-3 border border-accent/60 bg-[var(--accent-soft)] px-4 py-2.5 text-sm">
              <span className="flex items-center gap-2 font-medium text-text">
                <RefreshCw size={14} className="shrink-0 text-accent" />
                <span>{toast}</span>
              </span>
              <button className="mono shrink-0 border border-line bg-bg/60 px-2 py-0.5 text-[10.5px] uppercase tracking-wider text-muted transition hover:border-accent hover:text-text" onClick={onDismissToast}>
                dismiss
              </button>
            </div>
          </div>
        )}

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 md:px-6">
          {tab === "P" && <Portfolio crm={crm} go={(k) => setTab(k)} newSignalIds={newSignalIds} />}
          {tab !== "P" && current && <Account key={current.id} acc={current} crm={crm} />}
          {tab !== "P" && !current && <Portfolio crm={crm} go={(k) => setTab(k)} newSignalIds={newSignalIds} />}
        </main>
        <footer className="mx-auto max-w-[1400px] px-6 pb-8 pt-2 text-[11px] text-dim">
          Every number carries the id it comes from: click any <span className="mono text-muted">▤ id</span> chip to open the record. Data: Account Quest MCP (export, paperwork, live events) · built {fmtDate(crm.generatedAt.slice(0, 10))}.
        </footer>
      </div>
      {panel && <McpPanel sync={sync} onSync={onSync} syncing={syncing} syncMsg={syncMsg} lastPoll={lastPoll} pollEverySec={pollEverySec} onClose={() => setPanel(false)} />}
    </CiteProvider>
  );
}

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
      <rect width="28" height="28" fill="var(--accent)" />
      <path d="M6 18 L11 9 L14 14 L17 9 L22 18" stroke="#0b0b0c" strokeWidth="2.4" fill="none" strokeLinejoin="round" />
    </svg>
  );
}
