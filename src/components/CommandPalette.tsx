"use client";
// Ctrl+K / Cmd+K: jump to any screen, account, move, risk, person, dock or source, or run an action.
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Search } from "lucide-react";
import type { CrmView } from "@/lib/types";
import { useCite } from "./ui";

export interface PaletteItem { id: string; group: string; label: string; hint?: string; run: () => void }

export function CommandPalette({ open, onClose, crm, views, go, actions }: { open: boolean; onClose: () => void; crm: CrmView; views: { id: string; label: string; key?: string }[]; go: (v: string) => void; actions: PaletteItem[] }) {
  const { open: openCite } = useCite();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setQ(""); setSel(0); setTimeout(() => input.current?.focus(), 10); } }, [open]);

  const items: PaletteItem[] = useMemo(() => {
    const out: PaletteItem[] = [];
    views.forEach((v) => out.push({ id: `v-${v.id}`, group: "Go to", label: v.label, hint: v.key ? `key ${v.key}` : undefined, run: () => go(v.id) }));
    actions.forEach((a) => out.push(a));
    for (const a of crm.accounts) {
      a.moves.forEach((m) => out.push({ id: `m-${m.id}`, group: "Moves", label: m.title, hint: `${a.id} · ${m.owner} · ${m.due}`, run: () => go("queue") }));
      a.risks.forEach((r) => out.push({ id: `r-${r.id}`, group: "Risks", label: r.title, hint: `${a.id} · ${r.level}`, run: () => go("risks") }));
      a.people.forEach((p) => out.push({ id: `p-${a.id}-${p.id}`, group: "People", label: p.name, hint: `${a.id} · ${p.role} · ${p.stance}`, run: () => (crm.sources[p.id] ? openCite(p.id) : go(a.id)) }));
      a.deals.forEach((d) => out.push({ id: `d-${d.id}`, group: "Deals", label: d.title, hint: `${a.id} · ${d.stage}`, run: () => (crm.sources[d.id] ? openCite(d.id) : go(a.id)) }));
    }
    Object.values(crm.sources).filter((s) => s.kind !== "person" && s.kind !== "deal").forEach((s) => out.push({ id: `s-${s.id}`, group: "Sources", label: s.id.replace(/^[A-Z]:/, ""), hint: s.title.slice(0, 70), run: () => openCite(s.id) }));
    return out;
  }, [crm, views, actions, go, openCite]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const f = t ? items.filter((i) => `${i.label} ${i.hint ?? ""} ${i.group}`.toLowerCase().includes(t)) : items.filter((i) => i.group === "Go to" || i.group === "Actions");
    return f.slice(0, 40);
  }, [items, q]);

  if (!open) return null;
  const run = (i: PaletteItem) => { onClose(); i.run(); };
  return (
    <div className="fixed inset-0 z-[60] bg-black/60" onClick={onClose}>
      <div className="mx-auto mt-[10vh] w-[calc(100%-32px)] max-w-xl border border-line bg-panel shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-line px-3">
          <Search size={15} className="text-dim" />
          <input
            ref={input}
            value={q}
            onChange={(e) => { setQ(e.target.value); setSel(0); }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              else if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, shown.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
              else if (e.key === "Enter" && shown[sel]) run(shown[sel]);
            }}
            placeholder="Search screens, moves, risks, people, deals, docks, records…"
            className="h-12 flex-1 bg-transparent text-[15px] outline-none"
          />
          <kbd className="mono border border-line px-1.5 text-[10px] text-dim">esc</kbd>
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-1">
          {shown.length === 0 && <div className="p-4 text-sm text-muted">No match.</div>}
          {shown.map((i, n) => (
            <button key={i.id} onMouseEnter={() => setSel(n)} onClick={() => run(i)} className={clsx("flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm", n === sel ? "bg-[var(--accent-soft)]" : "")}>
              <span className="min-w-0 truncate"><span className="label mr-2 !text-[9px]">{i.group}</span>{i.label}</span>
              {i.hint && <span className="mono shrink-0 truncate text-[10.5px] text-dim">{i.hint}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
