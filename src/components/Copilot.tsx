"use client";
// AI Copilot: ask about the accounts in plain words. Answers stream from Claude, grounded on the live CRM.
// Every [id] in an answer becomes a source chip; an id that is not in the data is flagged, never trusted.
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { Bot, Loader2, Send, ShieldCheck, Trash2, TriangleAlert } from "lucide-react";
import type { CrmView } from "@/lib/types";
import { AnswerBanner, Panel, useCite } from "./ui";

type Turn = { role: "user" | "assistant"; content: string };
const KEY = "desk-copilot-v1";

const SUGGESTIONS = [
  "What should I do first on Monday, and why?",
  "Why is Aldermoor's health score so low?",
  "Trace the £180,000 of idle docks on Eastern Counties back to its sources.",
  "Who decides and who pays for the Eastern Counties renewal?",
  "What changed in the latest live events, and what does it mean for the renewals?",
  "Draft a 5-line update to my manager on both accounts.",
];

export function Copilot({ crm, focus }: { crm: CrmView; focus?: string }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        // Drop answers that were cut off (e.g. the page was closed mid-answer): never show an endless spinner.
        const saved = (JSON.parse(raw) as Turn[]).filter((t) => !(t.role === "assistant" && !t.content.trim()));
        setTurns(saved);
      }
    } catch {}
  }, []);
  useEffect(() => {
    if (!busy) return;
    const h = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(h);
  }, [busy]);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(turns.slice(-20))); } catch {}
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  const ask = async (question: string) => {
    if (!question.trim() || busy) return;
    const history = turns.filter((t) => t.content.trim() && !t.content.startsWith("[Copilot unavailable"));
    setTurns([...history, { role: "user", content: question }, { role: "assistant", content: "" }]);
    setQ("");
    setBusy(true);
    setStartedAt(Date.now());
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 90_000);
    try {
      const r = await fetch("/api/copilot", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question, history, account: focus }), signal: ctl.signal });
      if (!r.ok || !r.body) {
        const j = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
        setTurns((t) => [...t.slice(0, -1), { role: "assistant", content: `[Copilot unavailable: ${j.error}]` }]);
        return;
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setTurns((t) => [...t.slice(0, -1), { role: "assistant", content: acc }]);
      }
      if (!acc.trim()) setTurns((t) => [...t.slice(0, -1), { role: "assistant", content: "[Copilot unavailable: the answer came back empty. Try again.]" }]);
    } catch (e) {
      const msg = ctl.signal.aborted ? "no answer after 90 seconds. Try again or ask a shorter question." : String(e);
      setTurns((t) => [...t.slice(0, -1), { role: "assistant", content: `[Copilot unavailable: ${msg}]` }]);
    } finally {
      clearTimeout(timer);
      setBusy(false);
      setStartedAt(null);
    }
  };

  return (
    <div className="space-y-4">
      <AnswerBanner q="AI" title="Copilot" answer="Ask anything about the two accounts. Claude answers only from the live CRM data and cites the record behind every fact. Click a chip to check it. An id that is not in the data is flagged in red." />
      <Panel
        title="Ask the Copilot"
        hint="Claude Opus 5.5 · grounded on the portal's MCP data"
        right={turns.length > 0 && <button onClick={() => setTurns([])} className="mono flex items-center gap-1 text-[10.5px] uppercase tracking-wider text-muted hover:text-text"><Trash2 size={12} />Clear</button>}
      >
        <div className="max-h-[58vh] min-h-[200px] space-y-4 overflow-y-auto pr-1">
          {turns.length === 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted"><Bot size={16} className="text-accent" />Try one of these:</div>
              <div className="grid gap-2 md:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => ask(s)} className="border border-line bg-bg p-3 text-left text-sm text-text/90 transition hover:border-accent">{s}</button>
                ))}
              </div>
            </div>
          )}
          {turns.map((t, i) => (
            <div key={i} className={clsx("flex gap-3", t.role === "user" && "justify-end")}>
              {t.role === "assistant" && <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center bg-accent text-black"><Bot size={15} /></div>}
              <div className={clsx("max-w-[85%] text-sm leading-relaxed", t.role === "user" ? "border border-line bg-panel-2 px-3 py-2" : "")}>
                {t.role === "user" ? t.content : t.content ? <Answer text={t.content} crm={crm} /> : <span className="flex items-center gap-2 text-muted"><Loader2 size={14} className="animate-spin" />{busy ? `Claude is reading the accounts and thinking… ${startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0}s` : "Interrupted. Ask again."}<span className="hidden">{tick}</span></span>}
              </div>
            </div>
          ))}
          <div ref={end} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="mt-4 flex gap-2 border-t border-line pt-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Is the Aldermoor renewal at risk? Who should I call first?" className="flex-1 border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent" />
          <button disabled={busy || !q.trim()} className="mono flex items-center gap-1.5 border border-accent bg-accent px-3 py-2 text-[11px] uppercase tracking-wider text-black disabled:opacity-40">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}Ask
          </button>
        </form>
      </Panel>
    </div>
  );
}

/* Render an answer: paragraphs, "- " bullets, **bold**, and [id] citations as chips. */
function Answer({ text, crm }: { text: string; crm: CrmView }) {
  const { open } = useCite();
  const isIds = (inner: string) => inner.split(/\s*[,;]\s*/).every((x) => /^\S+$/.test(x));
  const cited = [...text.matchAll(/\[([^\]]{1,120})\]/g)].map((m) => m[1]).filter(isIds).flatMap((x) => x.split(/\s*[,;]\s*/)).filter((id) => !/^[A-Z]+$/.test(id));
  const ok = cited.filter((id) => crm.sources[id]).length;
  const bad = cited.filter((id) => !crm.sources[id] && /[_:\-.\d]/.test(id));

  const inline = (line: string): ReactNode[] =>
    line.split(/(\[[^\]]{1,120}\]|\*\*[^*]+\*\*)/g).filter(Boolean).map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) return <b key={i}>{part.slice(2, -2)}</b>;
      const m = part.match(/^\[([^\]]+)\]$/);
      if (m && m[1].startsWith("Copilot unavailable")) return <span key={i} className="block border border-red/40 bg-[var(--red-soft)] px-2 py-1 text-red">{m[1]}</span>;
      if (m && !isIds(m[1])) return <Fragment key={i}>{part}</Fragment>;
      if (m) {
        const ids = m[1].split(/\s*[,;]\s*/);
        if (ids.every((id) => crm.sources[id])) return <Fragment key={i}>{ids.map((id) => <button key={id} onClick={() => open(id)} className="mono mx-0.5 inline-flex items-center rounded-sm border border-line px-1 text-[10.5px] leading-4 text-muted hover:border-accent hover:text-accent">{id.replace(/^[A-Z]:/, "")}</button>)}</Fragment>;
        if (/^[A-Z][A-Z \-]+$/.test(m[1])) return <span key={i} className="text-amber">{part}</span>; // a [DATE]-style blank in a draft
        return <span key={i} title="This id is not in the CRM data" className="mono mx-0.5 rounded-sm border border-red/50 px-1 text-[10.5px] text-red">{m[1]}?</span>;
      }
      return <Fragment key={i}>{part}</Fragment>;
    });

  const lines = text.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((l, i) =>
        /^\s*[-•*]\s+/.test(l) ? <div key={i} className="flex gap-2 pl-1"><span className="text-accent">·</span><span>{inline(l.replace(/^\s*[-•*]\s+/, ""))}</span></div>
        : l.trim() ? <p key={i}>{inline(l)}</p> : <div key={i} className="h-1" />,
      )}
      {cited.length > 0 && (
        <div className={clsx("mt-2 flex items-center gap-1.5 text-[11px]", bad.length ? "text-red" : "text-green")}>
          {bad.length ? <TriangleAlert size={12} /> : <ShieldCheck size={12} />}
          {ok} citation{ok === 1 ? "" : "s"} checked against the CRM data{bad.length ? ` · ${bad.length} not found: treat those lines with care` : ": all found"}
        </div>
      )}
    </div>
  );
}
