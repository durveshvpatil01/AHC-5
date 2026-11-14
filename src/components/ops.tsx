"use client";
// Operations layer: every change a user makes (done, snooze, reassign, new due date, save a draft) is
// applied on screen at once and queued in an outbox. The outbox sends one write_note at a time through
// the portal's MCP connection, waiting whenever the token's one-call-a-minute limit says so.
// The game is the system of record: the next list_notes pull brings the change back for everyone.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { Check, Copy, Loader2, Mail, Send, X } from "lucide-react";
import type { AccountView, Move } from "@/lib/types";
import { Cite, Pill, fmtDate } from "./ui";

export type Patch = { status?: Move["status"]; owner?: string; due?: string };
export interface Op { id: string; label: string; account: string; kind: string; title: string; text: string; moveId?: string; patch?: Patch; nextTryAt: number; error?: string }

interface OpsCtx {
  queue: Op[];
  sending: boolean;
  overrides: Record<string, Patch>;
  people: string[];
  updateMove: (m: Move, account: string, patch: Patch, why?: string) => void;
  saveNote: (account: string, kind: string, title: string, text: string, label: string) => void;
  openDraft: (m: Move, acc: AccountView) => void;
  apply: (m: Move) => Move;
}
const Ctx = createContext<OpsCtx | null>(null);
export const useOps = () => useContext(Ctx)!;

const KEY = "desk-outbox-v1";

export function OpsProvider({ children, people, onSent }: { children: ReactNode; people: string[]; onSent: () => void }) {
  const [queue, setQueue] = useState<Op[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Patch>>({});
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState<{ m: Move; acc: AccountView } | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { queue: Op[]; overrides: Record<string, Patch> };
        setQueue(saved.queue ?? []);
        setOverrides(saved.overrides ?? {});
      }
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ queue, overrides })); } catch {}
  }, [queue, overrides]);

  // Outbox loop: send the oldest op when its time has come.
  useEffect(() => {
    const h = setInterval(async () => {
      if (busy.current) return;
      const op = queue[0];
      if (!op || Date.now() < op.nextTryAt) return;
      busy.current = true;
      setSending(true);
      try {
        const r = await fetch("/api/notes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ account: op.account, kind: op.kind, title: op.title, text: op.text }) });
        const j = await r.json();
        if (j.ok) {
          setQueue((q) => q.filter((x) => x.id !== op.id));
          onSent();
        } else {
          const wait = Number(j.waitSec ?? 30);
          setQueue((q) => q.map((x) => (x.id === op.id ? { ...x, nextTryAt: Date.now() + (wait + 1) * 1000, error: j.error } : x)));
        }
      } catch (e) {
        setQueue((q) => q.map((x) => (x.id === op.id ? { ...x, nextTryAt: Date.now() + 20_000, error: String(e) } : x)));
      } finally {
        busy.current = false;
        setSending(false);
      }
    }, 2_000);
    return () => clearInterval(h);
  }, [queue, onSent]);

  const enqueue = useCallback((op: Omit<Op, "id" | "nextTryAt">) => {
    setQueue((q) => [...q, { ...op, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, nextTryAt: 0 }]);
  }, []);

  const updateMove = useCallback((m: Move, account: string, patch: Patch, why?: string) => {
    setOverrides((o) => ({ ...o, [m.id]: { ...o[m.id], ...patch } }));
    const merged = { status: patch.status ?? m.status, owner: patch.owner ?? m.owner, due: patch.due ?? m.due };
    const text = `status=${merged.status}; owner=${merged.owner}; due=${merged.due}; by=CSM${why ? `; note=${why}` : ""}`;
    const label = patch.status === "done" ? "Mark done" : patch.status === "snoozed" ? "Snooze" : patch.status === "open" ? "Reopen" : patch.owner ? `Reassign to ${patch.owner}` : patch.due ? `Due ${patch.due}` : "Update";
    enqueue({ label: `${label}: ${m.title}`, account, kind: "task", title: `task:${m.id}`, text, moveId: m.id, patch });
  }, [enqueue]);

  const saveNote = useCallback((account: string, kind: string, title: string, text: string, label: string) => enqueue({ label, account, kind, title, text }), [enqueue]);

  const apply = useCallback((m: Move): Move => {
    const p = overrides[m.id];
    return p ? { ...m, status: p.status ?? m.status, owner: p.owner ?? m.owner, due: p.due ?? m.due } : m;
  }, [overrides]);

  return (
    <Ctx.Provider value={{ queue, sending, overrides, people, updateMove, saveNote, openDraft: (m, acc) => setDraft({ m, acc }), apply }}>
      {children}
      {draft && <DraftDrawer m={apply(draft.m)} acc={draft.acc} onClose={() => setDraft(null)} />}
    </Ctx.Provider>
  );
}

/* ---------- compact action buttons used on every move row ---------- */
export function MoveActions({ m, account, acc }: { m: Move; account: string; acc?: AccountView }) {
  const ops = useOps();
  const mv = ops.apply(m);
  const pending = ops.queue.some((q) => q.moveId === m.id);
  const btn = "mono flex items-center gap-1 border px-2 py-1 text-[10.5px] uppercase tracking-wider transition";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {mv.status !== "done" ? (
        <button onClick={() => ops.updateMove(m, account, { status: "done" })} className={clsx(btn, "border-line text-muted hover:border-green hover:text-green")} title="Mark done (written to the game as a task note)"><Check size={12} />Done</button>
      ) : (
        <button onClick={() => ops.updateMove(m, account, { status: "open" })} className={clsx(btn, "border-green/50 bg-[var(--green-soft)] text-green")} title="Reopen">Done ✓</button>
      )}
      {mv.status === "open" && (
        <button onClick={() => ops.updateMove(m, account, { status: "snoozed", due: addDays(mv.due, 3) }, "snoozed 3 days")} className={clsx(btn, "border-line text-muted hover:border-amber hover:text-amber")} title="Snooze 3 days">Snooze</button>
      )}
      {acc && m.draft && (
        <button onClick={() => ops.openDraft(m, acc)} className={clsx(btn, "border-line text-muted hover:border-accent hover:text-accent")} title="Open the drafted message"><Mail size={12} />Draft</button>
      )}
      {pending && <span className="mono flex items-center gap-1 text-[10px] text-amber"><Loader2 size={11} className="animate-spin" />syncing to game</span>}
    </div>
  );
}

const addDays = (iso: string, n: number) => new Date(new Date(iso + "T00:00:00Z").getTime() + n * 86_400_000).toISOString().slice(0, 10);

/* ---------- draft drawer ---------- */
function DraftDrawer({ m, acc, onClose }: { m: Move; acc: AccountView; onClose: () => void }) {
  const ops = useOps();
  const d = m.draft!;
  const [body, setBody] = useState(d.body);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const full = `To: ${d.to}\nSubject: ${d.subject}\n\n${body}`;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <aside className="h-full w-full max-w-[640px] overflow-y-auto border-l border-line bg-panel p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="label">Draft writer · {d.channel} · account {acc.id}</div>
            <h3 className="mt-1 text-lg font-semibold leading-snug">{m.title}</h3>
            <div className="mt-1 text-xs text-muted">Owner {m.owner} · due {fmtDate(m.due)} · built only from facts on file; edit the [brackets] before sending.</div>
          </div>
          <button aria-label="Close" onClick={onClose} className="rounded border border-line p-1.5 text-muted hover:text-text"><X size={16} /></button>
        </div>
        <div className="mt-4 space-y-2 border border-line bg-bg p-3 text-sm">
          <div><span className="text-dim">To </span>{d.to}</div>
          <div><span className="text-dim">Subject </span><span className="font-medium">{d.subject}</span></div>
        </div>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={18} className="mono mt-2 w-full border border-line bg-bg p-3 text-[12.5px] leading-relaxed outline-none focus:border-accent" />
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs"><span className="text-dim">Rests on</span><Cite ids={d.cite} max={8} /></div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={async () => { try { await navigator.clipboard.writeText(full); setCopied(true); } catch {} }} className="mono flex items-center gap-1.5 border border-accent bg-accent px-3 py-1.5 text-[11px] uppercase tracking-wider text-black">
            {copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "Copied" : "Copy"}
          </button>
          <button onClick={() => { ops.saveNote(acc.id, "note", `draft:${m.id}`, full.slice(0, 1900), `Save draft: ${m.title}`); setSaved(true); }} disabled={saved} className="mono flex items-center gap-1.5 border border-line px-3 py-1.5 text-[11px] uppercase tracking-wider text-muted hover:border-accent hover:text-accent disabled:opacity-50">
            <Send size={13} />{saved ? "Queued to game" : "Save draft to game"}
          </button>
          <button onClick={() => { ops.updateMove(m, acc.id, { status: "done" }, "message sent"); onClose(); }} className="mono flex items-center gap-1.5 border border-line px-3 py-1.5 text-[11px] uppercase tracking-wider text-muted hover:border-green hover:text-green">
            <Check size={13} />Mark sent + done
          </button>
        </div>
        {m.history.length > 0 && (
          <div className="mt-6">
            <div className="label">Task history (from the game)</div>
            <div className="mt-2 space-y-1 text-xs text-muted">{m.history.map((h, i) => <div key={i}><span className="mono text-dim">{h.at}</span> · {h.text}</div>)}</div>
          </div>
        )}
      </aside>
    </div>
  );
}

/* ---------- outbox status chip for the header ---------- */
export function OutboxChip() {
  const { queue, sending } = useOps();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const h = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(h); }, []);
  if (!queue.length) return null;
  const next = Math.max(0, Math.ceil((queue[0].nextTryAt - now) / 1000));
  return (
    <span title={queue.map((q) => q.label).join("\n")} className="mono flex items-center gap-1.5 border border-amber/40 bg-[var(--amber-soft)] px-2 py-1 text-[10.5px] uppercase tracking-wider text-amber">
      {sending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
      {queue.length} to game{next > 0 ? ` · ${next}s` : ""}
    </span>
  );
}

export function StatusPill({ status }: { status: Move["status"] }) {
  return <Pill level={status === "done" ? "green" : status === "snoozed" ? "amber" : "grey"}>{status}</Pill>;
}
