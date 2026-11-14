"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Radio, RefreshCw } from "lucide-react";
import type { CrmView } from "@/lib/types";
import { CiteProvider, fmtDate } from "./ui";
import { Portfolio } from "./Portfolio";
import { Account } from "./Account";

type Tab = "P" | "A" | "B";

export function Desk({ crm }: { crm: CrmView }) {
  const [tab, setTab] = useState<Tab>("P");
  const router = useRouter();
  const [lastPoll, setLastPoll] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [newSignalIds, setNewSignalIds] = useState<Set<string>>(() => new Set());
  const finger = useRef<string | null>(null);
  const known = useRef<Set<string>>(new Set(crm.accounts.flatMap((a) => a.signals.map((s) => s.id))));

  useEffect(() => {
    try {
      const t = localStorage.getItem("desk-tab") as Tab | null;
      if (t === "A" || t === "B" || t === "P") setTab(t);
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("desk-tab", tab); } catch {}
  }, [tab]);

  // Live: poll the server fingerprint every 30 s; re-render the page when the data changed.
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch("/api/live", { cache: "no-store" });
        const j = await r.json();
        setLastPoll(new Date().toISOString());
        if (finger.current && j.fingerprint !== finger.current) {
          const fresh = (j.signals as { id: string; title: string }[]).filter((s) => !known.current.has(s.id));
          fresh.forEach((s) => known.current.add(s.id));
          if (fresh.length) {
            setNewSignalIds((prev) => new Set([...prev, ...fresh.map((s) => s.id)]));
          }
          setToast(fresh.length ? `New live event: ${fresh.map((s) => s.title).join(" · ")}` : "Account data updated");
          router.refresh();
        }
        finger.current = j.fingerprint;
      } catch {}
    };
    tick();
    const h = setInterval(() => !stop && tick(), 30_000);
    return () => { stop = true; clearInterval(h); };
  }, [router]);

  const A = crm.accounts.find((a) => a.id === "A")!;
  const B = crm.accounts.find((a) => a.id === "B")!;
  const live = crm.sync.signals?.source === "live";

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
              {([["P", "Portfolio", null], ["A", "Eastern Counties", A.kpis.health.score], ["B", "Aldermoor", B.kpis.health.score]] as const).map(([k, label, h]) => (
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
              <span
                className={clsx(
                  "flex items-center gap-1.5 border px-2.5 py-1 transition",
                  live ? "border-green/35 bg-[var(--green-soft)]/50" : "border-amber/35 bg-[var(--amber-soft)]/40"
                )}
                title={`signals: ${crm.sync.signals?.source} @ ${crm.sync.signals?.at}\nexport: ${crm.sync.export?.source} @ ${crm.sync.export?.at}\nnotes: ${crm.sync.notes?.source} @ ${crm.sync.notes?.at}`}
              >
                <Radio size={12} className={clsx(live ? "live-dot text-green" : "text-amber")} />
                <span className={clsx("mono text-[11px] font-medium uppercase tracking-wider", live ? "text-green" : "text-amber")}>
                  {live ? "Live" : "Snapshot"}
                </span>
                <span className="mono text-[11px] text-muted">· {crm.sync.signals?.count ?? 0} events</span>
                {lastPoll && (
                  <span className="mono hidden text-[11px] text-dim md:inline">
                    · checked {new Date(lastPoll).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </span>
            </div>
          </div>
        </header>

        {toast && (
          <div className="mx-auto w-full max-w-[1400px] px-4 pt-3 md:px-6">
            <div role="status" className="flash-new flex items-center justify-between gap-3 border border-accent/60 bg-[var(--accent-soft)] px-4 py-2.5 text-sm">
              <span className="flex items-center gap-2 font-medium text-text">
                <RefreshCw size={14} className="shrink-0 text-accent" />
                <span>{toast}</span>
              </span>
              <button className="mono shrink-0 border border-line bg-bg/60 px-2 py-0.5 text-[10.5px] uppercase tracking-wider text-muted transition hover:border-accent hover:text-text" onClick={() => setToast(null)}>
                dismiss
              </button>
            </div>
          </div>
        )}

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 md:px-6">
          {tab === "P" && <Portfolio crm={crm} go={(k) => setTab(k)} newSignalIds={newSignalIds} />}
          {tab === "A" && <Account acc={A} crm={crm} />}
          {tab === "B" && <Account acc={B} crm={crm} />}
        </main>
        <footer className="mx-auto max-w-[1400px] px-6 pb-8 pt-2 text-[11px] text-dim">
          Every number carries the id it comes from: click any <span className="mono text-muted">▤ id</span> chip to open the record. Data: Account Quest MCP (export, paperwork, live events) · built {fmtDate(crm.generatedAt.slice(0, 10))}.
        </footer>
      </div>
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
