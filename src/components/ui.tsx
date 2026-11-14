"use client";
import clsx from "clsx";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { X, FileText, ChevronDown, ChevronUp } from "lucide-react";
import type { Level, Money, Source, Stance } from "@/lib/types";

/* ---------- citation drawer ---------- */
type CiteCtx = { sources: Record<string, Source>; open: (id: string) => void };
const Ctx = createContext<CiteCtx>({ sources: {}, open: () => {} });
export const useCite = () => useContext(Ctx);

export function CiteProvider({ sources, children }: { sources: Record<string, Source>; children: ReactNode }) {
  const [stack, setStack] = useState<string[]>([]);
  const cur = stack[stack.length - 1];
  const src = cur ? sources[cur] : undefined;
  return (
    <Ctx.Provider value={{ sources, open: (id) => setStack((s) => [...s, id]) }}>
      {children}
      {src && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={() => setStack([])}>
          <aside className="h-full w-full max-w-[560px] overflow-y-auto border-l border-line bg-panel p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="label">Source · {src.kind}</div>
                <div className="mono mt-1 text-[13px] text-accent">{src.id}</div>
                <h3 className="mt-2 text-lg font-semibold leading-snug">{src.title}</h3>
                {src.meta && <div className="mt-1 text-xs text-muted">{src.meta}</div>}
              </div>
              <button aria-label="Close" onClick={() => setStack([])} className="rounded border border-line p-1.5 text-muted hover:text-text"><X size={16} /></button>
            </div>
            <pre className="mono whitespace-pre-wrap rounded border border-line bg-bg p-4 text-[12px] leading-relaxed text-text/90">{src.text}</pre>
            {stack.length > 1 && <button className="mt-4 text-xs text-muted underline" onClick={() => setStack((s) => s.slice(0, -1))}>← back</button>}
          </aside>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function Cite({ ids, max = 3 }: { ids: string[]; max?: number }) {
  const { sources, open } = useCite();
  const uniq = [...new Set(ids)].filter(Boolean);
  const [all, setAll] = useState(false);
  const shown = all ? uniq : uniq.slice(0, max);
  if (!uniq.length) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1 align-middle">
      {shown.map((id) => (
        <button
          key={id}
          onClick={(e) => { e.stopPropagation(); open(id); }}
          title={sources[id]?.title ?? "source"}
          className={clsx("mono inline-flex items-center gap-1 rounded-sm border px-1.5 py-[1px] text-[10.5px] leading-4 transition", sources[id] ? "border-line text-muted hover:border-accent hover:text-accent" : "border-red/50 text-red")}
        >
          <FileText size={10} />
          {id.replace(/^[AB]:/, "")}
        </button>
      ))}
      {uniq.length > max && !all && <button onClick={(e) => { e.stopPropagation(); setAll(true); }} className="mono text-[10.5px] text-dim hover:text-text">+{uniq.length - max}</button>}
    </span>
  );
}

/* ---------- pills & bits ---------- */
const levelCls: Record<Level, string> = {
  red: "bg-[var(--red-soft)] text-red border-red/40",
  amber: "bg-[var(--amber-soft)] text-amber border-amber/40",
  green: "bg-[var(--green-soft)] text-green border-green/40",
  grey: "bg-white/5 text-muted border-line",
};
export function Pill({ level = "grey", children, className }: { level?: Level; children: ReactNode; className?: string }) {
  return <span className={clsx("mono inline-flex items-center rounded-sm border px-1.5 py-[1px] text-[10px] uppercase tracking-[0.12em]", levelCls[level], className)}>{children}</span>;
}

export const stanceLevel = (s: Stance): Level => (s === "ally" || s === "warm" ? "green" : s === "neutral" ? "amber" : s === "guarded" ? "red" : "grey");
export function StancePill({ stance }: { stance: Stance }) {
  return <Pill level={stanceLevel(stance)}>{stance === "unknown" ? "not met" : stance}</Pill>;
}

export function fmtMoney(m: { amount: number | null; currency: string }) {
  if (m.amount == null) return "no value";
  const sym = m.currency === "GBP" ? "£" : m.currency === "EUR" ? "€" : "$";
  return sym + Math.round(m.amount).toLocaleString("en-GB");
}

export function BasisPill({ basis }: { basis: Money["basis"] }) {
  const map: Record<Money["basis"], Level> = { backed: "green", told: "amber", claim: "red", unknown: "grey" };
  return <Pill level={map[basis]}>{basis}</Pill>;
}

export function Panel({ title, hint, right, children, className }: { title?: ReactNode; hint?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={clsx("border border-line bg-panel", className)}>
      {(title || right) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 bg-accent" />
            <span className="label !text-text/90">{title}</span>
            {hint && <span className="text-xs text-muted">{hint}</span>}
          </div>
          {right}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Bar({ parts, height = 8 }: { parts: { value: number; color: string; label?: string }[]; height?: number }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  return (
    <div className="flex w-full overflow-hidden bg-white/5" style={{ height }}>
      {parts.map((p, i) => (
        <div key={i} title={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
      ))}
    </div>
  );
}

export function Spark({ values, w = 90, h = 22, color = "var(--accent)" }: { values: number[]; w?: number; h?: number; color?: string }) {
  const max = Math.max(...values, 1);
  const step = w / Math.max(values.length - 1, 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * (h - 2) - 1).toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}

export function fmtDate(iso: string | null) {
  if (!iso) return "date unknown";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00Z" : ""));
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
