"use client";
// Playbook: every lesson from these accounts (mistakes not to repeat, things that worked), with evidence,
// plus the reusable checklist for the next account. Add your own lesson; it is written to the game.
import { useState } from "react";
import clsx from "clsx";
import { BookOpenCheck, CheckCircle2, TriangleAlert } from "lucide-react";
import type { CrmView } from "@/lib/types";
import { PLAYBOOK } from "@/lib/lessons";
import { AnswerBanner, Cite, Panel, Pill } from "./ui";
import { useOps } from "./ops";

export function Playbook({ crm }: { crm: CrmView }) {
  const ops = useOps();
  const lessons = crm.accounts.flatMap((a) => a.lessons.lessons.map((l) => ({ ...l, accName: a.name })));
  const [filter, setFilter] = useState<"all" | "mistake" | "worked">("all");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [acc, setAcc] = useState(crm.accounts[0]?.id ?? "A");
  const [saved, setSaved] = useState(false);
  const shown = lessons.filter((l) => filter === "all" || l.kind === filter);
  const mistakes = lessons.filter((l) => l.kind === "mistake").length;
  return (
    <div className="space-y-4">
      <AnswerBanner q="Learn" title="Playbook: what we will not repeat" answer={`${mistakes} mistakes and ${lessons.length - mistakes} things that worked, each backed by the record. They become rules (and warnings on moves), and a checklist for the next account, so a new police county or plant group starts where these two ended.`} />

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="Lessons" hint="from the handover history, the morning and your notes" right={
          <div className="flex gap-1">{(["all", "mistake", "worked"] as const).map((f) => <button key={f} onClick={() => setFilter(f)} className={clsx("mono border px-2 py-0.5 text-[10.5px] uppercase", filter === f ? "border-accent text-accent" : "border-line text-muted")}>{f === "mistake" ? "don't repeat" : f === "worked" ? "keep doing" : "all"}</button>)}</div>
        }>
          <div className="divide-y divide-line">
            {shown.map((l) => (
              <div key={l.id} className="py-3 first:pt-0">
                <div className="flex flex-wrap items-center gap-2">
                  {l.kind === "worked" ? <CheckCircle2 size={14} className="text-green" /> : <TriangleAlert size={14} className="text-amber" />}
                  <span className="font-medium">{l.title}</span>
                  <Pill level="amber">Acct {l.account}</Pill>
                  <span className="text-[11px] text-dim">{l.source}</span>
                </div>
                <div className="mt-1 text-sm text-text/85"><span className="text-dim">What happened: </span>{l.whatHappened}</div>
                <div className="mt-0.5 text-sm text-muted"><span className="text-dim">Why: </span>{l.why}</div>
                <div className={clsx("mt-1 text-sm", l.kind === "worked" ? "text-green" : "text-accent")}><span className="text-dim">Rule next time: </span>{l.rule}</div>
                <div className="mt-1"><Cite ids={[l.id, ...l.cite]} max={4} /></div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Playbook for the next account" hint="e.g. a new police county or plant group" right={<BookOpenCheck size={14} className="text-accent" />}>
            <div className="space-y-4">
              {PLAYBOOK.map((ph) => (
                <div key={ph.phase}>
                  <div className="label !text-accent">{ph.phase}</div>
                  <ol className="mt-1 space-y-1.5">
                    {ph.steps.map((s, i) => (
                      <li key={i} className="text-sm"><span className="font-medium">{s.do}</span><div className="text-xs text-muted">{s.because}</div></li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Add a lesson" hint="written to the game as a note; it comes back here for everyone">
            <div className="space-y-2">
              <select value={acc} onChange={(e) => setAcc(e.target.value)} className="w-full border border-line bg-bg px-2 py-1.5 text-sm">{crm.accounts.map((a) => <option key={a.id} value={a.id}>{a.id} · {a.name}</option>)}</select>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lesson, e.g. Don't ask Karen for more docks before the documentation lands" className="w-full border border-line bg-bg px-2 py-1.5 text-sm outline-none focus:border-accent" />
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="The rule for next time" className="w-full border border-line bg-bg px-2 py-1.5 text-sm outline-none focus:border-accent" />
              <div className="flex items-center gap-3">
                <button disabled={!title.trim() || !text.trim()} onClick={() => { ops.saveNote(acc, "note", `lesson: ${title.trim()}`, text.trim(), `Lesson: ${title.trim()}`); setSaved(true); setTitle(""); setText(""); }} className="mono border border-accent bg-accent px-3 py-1.5 text-[11px] uppercase tracking-wider text-black disabled:opacity-40">Save lesson</button>
                {saved && <span className="text-xs text-muted">Queued to the game; appears after the next notes pull.</span>}
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
