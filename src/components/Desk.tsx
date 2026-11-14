"use client";
// App shell: left rail (like the hackathon 4 console), live MCP status in the header, Ctrl+K command
// palette, keyboard shortcuts, and the outbox that writes every change back to the game.
import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Building2, FileText, History, Keyboard, LayoutDashboard, ListChecks, Loader2, PlugZap, RefreshCw, Search, ShieldAlert, X } from "lucide-react";
import type { CrmView } from "@/lib/types";
import type { SyncStatus } from "@/lib/sync";
import { CiteProvider, fmtDate } from "./ui";
import { Portfolio } from "./Portfolio";
import { Account } from "./Account";
import { McpPanel, useNow } from "./McpPanel";
import { ActionQueue } from "./ActionQueue";
import { RiskRadar } from "./RiskRadar";
import { ChangeLog } from "./ChangeLog";
import { Brief } from "./Brief";
import { CommandPalette, type PaletteItem } from "./CommandPalette";
import { OpsProvider, OutboxChip, useOps } from "./ops";

type View = string; // "P" | "queue" | "risks" | "log" | "brief" | account id

export function Desk(props: {
  crm: CrmView; sync: SyncStatus; toast: string | null; onDismissToast: () => void; newSignalIds: Set<string>;
  onSync: () => void; syncing: boolean; syncMsg: string | null; lastPoll: string | null; pollEverySec: number; onRefresh: () => void;
}) {
  const people = useMemo(() => props.crm.team.map((t) => t.name), [props.crm.team]);
  return (
    <CiteProvider sources={props.crm.sources}>
      <OpsProvider people={people} onSent={props.onRefresh}>
        <Shell {...props} />
      </OpsProvider>
    </CiteProvider>
  );
}

function Shell({ crm, sync, toast, onDismissToast, newSignalIds, onSync, syncing, syncMsg, lastPoll, pollEverySec }: Parameters<typeof Desk>[0]) {
  const [view, setView] = useState<View>("P");
  const [panel, setPanel] = useState(false);
  const [palette, setPalette] = useState(false);
  const [help, setHelp] = useState(false);
  const now = useNow();
  const ops = useOps();

  useEffect(() => {
    try {
      const t = localStorage.getItem("desk-view");
      if (t) setView(t);
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("desk-view", view); } catch {}
    window.scrollTo({ top: 0 });
  }, [view]);

  const shortName = (n: string) => n.replace(/(Industrial Group|Police Alliance|Group|Ltd|Inc)/g, "").trim();
  const openMoves = crm.accounts.flatMap((a) => a.moves.map(ops.apply)).filter((m) => m.status === "open");
  const overdue = openMoves.filter((m) => m.due <= crm.asOf).length;
  const reds = crm.accounts.flatMap((a) => a.risks).filter((r) => r.level === "red").length;

  const nav: { id: View; label: string; icon: typeof Building2; key: string; badge?: string | number; badgeCls?: string; group?: string }[] = [
    { id: "P", label: "Portfolio", icon: LayoutDashboard, key: "p", group: "Overview" },
    { id: "queue", label: "Action queue", icon: ListChecks, key: "q", badge: openMoves.length, badgeCls: overdue ? "bg-[var(--red-soft)] text-red" : undefined },
    { id: "risks", label: "Risk radar", icon: ShieldAlert, key: "r", badge: reds, badgeCls: "bg-[var(--red-soft)] text-red" },
    ...crm.accounts.map((a, i) => ({ id: a.id, label: shortName(a.name), icon: Building2, key: String(i + 1), badge: a.kpis.health.score, badgeCls: a.kpis.health.score < 40 ? "bg-[var(--red-soft)] text-red" : a.kpis.health.score < 65 ? "bg-[var(--amber-soft)] text-amber" : "bg-[var(--green-soft)] text-green", group: i === 0 ? "Accounts" : undefined })),
    { id: "log", label: "Change log", icon: History, key: "l", badge: sync.changes.length || undefined, group: "Live" },
    { id: "brief", label: "Monday brief", icon: FileText, key: "b" },
  ];
  const go = useCallback((v: string) => setView(v), []);

  // Keyboard: Ctrl/Cmd+K palette, single keys for screens, s = sync, m = MCP panel, ? = help.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); return; }
      const t = e.target as HTMLElement;
      if (e.ctrlKey || e.metaKey || e.altKey || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable) return;
      if (palette || help) { if (e.key === "Escape") { setPalette(false); setHelp(false); } return; }
      if (e.key === "?") { setHelp(true); return; }
      if (e.key === "/") { e.preventDefault(); setPalette(true); return; }
      if (e.key === "s") { onSync(); return; }
      if (e.key === "m") { setPanel((p) => !p); return; }
      const hit = nav.find((n) => n.key === e.key);
      if (hit) setView(hit.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const actions: PaletteItem[] = [
    { id: "a-sync", group: "Actions", label: "Sync live events now (get_signals)", hint: "key s", run: onSync },
    { id: "a-mcp", group: "Actions", label: "Open the MCP connection panel", hint: "key m", run: () => setPanel(true) },
    { id: "a-print", group: "Actions", label: "Print the Monday brief", run: () => { setView("brief"); setTimeout(() => window.print(), 300); } },
    { id: "a-help", group: "Actions", label: "Keyboard shortcuts", hint: "?", run: () => setHelp(true) },
  ];

  const live = sync.sources.some((x) => x.source === "live");
  const lastCall = sync.log[0];
  const lastCallAgo = lastCall && now ? Math.max(0, Math.round((now - new Date(lastCall.at).getTime()) / 1000)) : null;
  const current = crm.accounts.find((a) => a.id === view);

  return (
    <div className="flex min-h-dvh">
      {/* left rail */}
      <aside className="sticky top-0 hidden h-dvh w-16 shrink-0 flex-col border-r border-line bg-panel md:flex xl:w-[220px] print:hidden">
        <div className="flex h-14 items-center gap-2.5 border-b border-line px-3">
          <Logo />
          <div className="hidden leading-tight xl:block">
            <div className="text-[14.5px] font-semibold tracking-tight">Account Desk</div>
            <div className="label !text-[9px]">FlytBase · CS</div>
          </div>
        </div>
        <button onClick={() => setPalette(true)} className="mx-2 mt-2 flex items-center justify-center gap-2 border border-line px-2 py-1.5 text-xs text-muted hover:border-accent hover:text-text xl:justify-between" title="Search (Ctrl+K)">
          <span className="flex items-center gap-2"><Search size={14} /><span className="hidden xl:inline">Search…</span></span>
          <kbd className="mono hidden border border-line px-1 text-[9.5px] xl:inline">Ctrl K</kbd>
        </button>
        <nav aria-label="Main" className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {nav.map((n) => (
            <div key={n.id}>
              {n.group && <div className="label hidden px-2 pb-1 pt-3 !text-[9.5px] xl:block">{n.group}</div>}
              <button
                onClick={() => setView(n.id)}
                aria-current={view === n.id ? "page" : undefined}
                title={`${n.label} (${n.key})`}
                className={clsx("flex min-h-10 w-full items-center justify-center gap-3 px-3 text-[13.5px] transition xl:justify-start", view === n.id ? "bg-[var(--accent-soft)] text-text shadow-[inset_2px_0_0_var(--accent)]" : "text-muted hover:bg-white/5 hover:text-text")}
              >
                <n.icon size={17} className="shrink-0" />
                <span className="hidden flex-1 truncate text-left xl:inline">{n.label}</span>
                {n.badge != null && <span className={clsx("mono hidden rounded-sm px-1 text-[10px] xl:inline", n.badgeCls ?? "bg-white/5 text-muted")}>{n.badge}</span>}
              </button>
            </div>
          ))}
        </nav>
        <button onClick={() => setPanel(true)} className="m-2 flex items-center justify-center gap-2 border border-line p-2 text-left text-[11px] text-muted hover:border-accent xl:justify-start" title="MCP connection (m)">
          <PlugZap size={14} className={live ? "live-dot text-green" : "text-amber"} />
          <span className="hidden leading-tight xl:block">MCP {live ? "live" : "connecting"}<br /><span className="text-dim">{lastCall ? `${lastCall.tool} · ${lastCallAgo ?? "…"}s ago` : "waiting for first call"}</span></span>
        </button>
        <button onClick={() => setHelp(true)} className="mb-2 hidden items-center gap-2 px-4 text-[11px] text-dim hover:text-text xl:flex"><Keyboard size={13} />Shortcuts: press ?</button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* header */}
        <header className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur print:hidden">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 md:px-6">
            <div className="flex items-center gap-2 md:hidden"><Logo /><span className="font-semibold">Account Desk</span></div>
            <div className="hidden min-w-0 md:block">
              <div className="label !text-[9.5px]">{view === "P" ? "Overview" : current ? `Account ${current.id}` : "Workspace"}</div>
              <div className="truncate text-[15px] font-semibold">{nav.find((n) => n.id === view)?.label ?? "Portfolio"}{current ? ` · ${current.name}` : ""}</div>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="hidden items-center gap-1.5 lg:inline-flex"><span className="label !text-[9.5px]">Account date</span><span className="mono border border-line bg-panel px-1.5 py-0.5 text-[11px] text-text">{fmtDate(crm.asOf)}</span></span>
              <OutboxChip />
              <button onClick={() => setPanel(true)} title="MCP connection panel (m)" className={clsx("flex items-center gap-1.5 border px-2.5 py-1 transition hover:border-accent", live ? "border-green/35 bg-[var(--green-soft)]/50" : "border-amber/35 bg-[var(--amber-soft)]/40")}>
                <PlugZap size={12} className={clsx(live ? "live-dot text-green" : "text-amber")} />
                <span className={clsx("mono text-[11px] font-medium uppercase tracking-wider", live ? "text-green" : "text-amber")}>{live ? "MCP live" : "MCP connecting"}</span>
                <span className="mono text-[11px] text-muted">· {crm.sync.signals?.count ?? 0} events</span>
                <span className="mono hidden text-[11px] text-dim sm:inline">· {lastCall ? `${lastCall.tool} ${lastCallAgo ?? "…"}s ago` : lastPoll ? "first call soon" : "…"}</span>
              </button>
              <button onClick={onSync} disabled={syncing} title="Ask the MCP for new live events now (s)" className="mono flex items-center gap-1 border border-line px-2 py-1 text-[10.5px] uppercase tracking-wider text-muted hover:border-accent hover:text-accent disabled:opacity-50">
                {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Sync
              </button>
            </div>
          </div>
          {/* mobile nav */}
          <div className="flex gap-1 overflow-x-auto border-t border-line px-2 py-1 md:hidden">
            {nav.map((n) => (
              <button key={n.id} onClick={() => setView(n.id)} className={clsx("mono shrink-0 px-2 py-1.5 text-[10.5px] uppercase tracking-wider", view === n.id ? "text-accent" : "text-muted")}>{n.label}</button>
            ))}
          </div>
        </header>

        {syncMsg && !panel && <div className="px-4 pt-2 text-xs text-muted md:px-6 print:hidden">{syncMsg}</div>}
        {toast && (
          <div className="px-4 pt-3 md:px-6 print:hidden">
            <div role="status" className="flash-new flex items-center justify-between gap-3 border border-accent/60 bg-[var(--accent-soft)] px-4 py-2.5 text-sm">
              <span className="flex items-center gap-2 font-medium text-text"><RefreshCw size={14} className="shrink-0 text-accent" /><span>{toast}</span></span>
              <span className="flex shrink-0 gap-2">
                <button className="mono border border-line bg-bg/60 px-2 py-0.5 text-[10.5px] uppercase tracking-wider text-muted hover:border-accent hover:text-text" onClick={() => { setView("log"); onDismissToast(); }}>what changed</button>
                <button className="mono border border-line bg-bg/60 px-2 py-0.5 text-[10.5px] uppercase tracking-wider text-muted hover:border-accent hover:text-text" onClick={onDismissToast}>dismiss</button>
              </span>
            </div>
          </div>
        )}

        <main className="w-full max-w-[1400px] flex-1 px-4 py-5 md:px-6 print:p-0">
          {view === "P" && <Portfolio crm={crm} go={go} newSignalIds={newSignalIds} />}
          {view === "queue" && <ActionQueue crm={crm} />}
          {view === "risks" && <RiskRadar crm={crm} go={go} />}
          {view === "log" && <ChangeLog crm={crm} sync={sync} />}
          {view === "brief" && <Brief crm={crm} />}
          {current && <Account key={current.id} acc={current} crm={crm} />}
          {!["P", "queue", "risks", "log", "brief"].includes(view) && !current && <Portfolio crm={crm} go={go} newSignalIds={newSignalIds} />}
        </main>
        <footer className="px-6 pb-8 pt-2 text-[11px] text-dim print:hidden">
          Every number carries the id it comes from: click any <span className="mono text-muted">▤ id</span> chip to open the record. Data: the portal&apos;s own MCP connection to Account Quest · Ctrl+K to search · ? for shortcuts.
        </footer>
      </div>

      {panel && <McpPanel sync={sync} onSync={onSync} syncing={syncing} syncMsg={syncMsg} lastPoll={lastPoll} pollEverySec={pollEverySec} onClose={() => setPanel(false)} />}
      <CommandPalette open={palette} onClose={() => setPalette(false)} crm={crm} views={nav.map((n) => ({ id: n.id, label: n.label, key: n.key }))} go={go} actions={actions} />
      {help && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 pt-[12vh]" onClick={() => setHelp(false)}>
          <div className="w-[calc(100%-32px)] max-w-md border border-line bg-panel p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><div className="label">Keyboard shortcuts</div><button onClick={() => setHelp(false)} className="text-muted"><X size={15} /></button></div>
            <div className="mt-3 grid grid-cols-[80px_1fr] gap-y-1.5 text-sm">
              {[["Ctrl K, /", "Search everything"], ...nav.map((n) => [n.key, n.label]), ["s", "Sync live events now"], ["m", "MCP connection panel"], ["Esc", "Close a drawer or dialog"], ["?", "This help"]].map(([k, l]) => (
                <div key={k + l} className="contents"><kbd className="mono w-fit border border-line px-1.5 text-[11px] text-muted">{k}</kbd><span>{l}</span></div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden className="shrink-0">
      <rect width="28" height="28" fill="var(--accent)" />
      <path d="M6 18 L11 9 L14 14 L17 9 L22 18" stroke="#0b0b0c" strokeWidth="2.4" fill="none" strokeLinejoin="round" />
    </svg>
  );
}
