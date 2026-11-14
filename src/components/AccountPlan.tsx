"use client";
// Account plan: the proactive layer. Story so far (handover -> events -> now), the unlock map (deliver X ->
// unlocks a person / usage / money / expansion), per-force or per-plant segments, and a plan on three horizons.
// Printable as the plan to present to Neel (CX manager).
import { useState } from "react";
import clsx from "clsx";
import { ArrowRight, Printer, TriangleAlert } from "lucide-react";
import type { CrmView } from "@/lib/types";
import type { ChainStep, PlanItem, Segment } from "@/lib/plan";
import { AnswerBanner, Cite, Panel, Pill, fmtDate, fmtMoney } from "./ui";

const KIND_LABEL: Record<ChainStep["kind"], string> = { deliver: "Deliver", person: "Person", usage: "Usage", proof: "Proof", money: "Money", expansion: "Expand" };
const STATUS_LEVEL = { done: "green", open: "grey", blocked: "red", "at-risk": "amber", hypothesis: "grey" } as const;
const HORIZONS: { id: PlanItem["horizon"]; label: string; hint: string }[] = [
  { id: "2w", label: "Next 2 weeks", hint: "unblockers: everything later depends on these" },
  { id: "quarter", label: "This quarter", hint: "people, usage and proof" },
  { id: "12m", label: "12 months", hint: "money and expansion, once value is proven" },
];

export function AccountPlan({ crm }: { crm: CrmView }) {
  const [accId, setAccId] = useState(crm.accounts[0]?.id ?? "A");
  const acc = crm.accounts.find((a) => a.id === accId) ?? crm.accounts[0];
  const p = acc.plan;
  const guards = acc.lessons.guards;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1 print:hidden">
          {crm.accounts.map((a) => (
            <button key={a.id} onClick={() => setAccId(a.id)} className={clsx("mono border px-3 py-1.5 text-[11px] uppercase tracking-wider", a.id === acc.id ? "border-accent bg-[var(--accent-soft)] text-text" : "border-line text-muted hover:text-text")}>{a.id} · {a.name}</button>
          ))}
        </div>
        <button onClick={() => window.print()} className="mono flex items-center gap-1.5 border border-accent bg-accent px-3 py-1.5 text-[11px] uppercase tracking-wider text-black print:hidden"><Printer size={13} />Print plan for Neel</button>
      </div>
      <AnswerBanner q="Plan" title={`Account plan · ${acc.name}`} answer={p.headline} />

      {/* Story so far */}
      <Panel title="Story so far" hint="where we started (Sam's handover), what happened, where we are now">
        <div className="grid gap-4 lg:grid-cols-3">
          {([["Start: the handover", p.story.start], ["What happened", p.story.events], ["Now", p.story.now]] as const).map(([title, pts], col) => (
            <div key={title}>
              <div className="label mb-2 flex items-center gap-2">{title}{col < 2 && <ArrowRight size={12} className="hidden text-accent lg:inline" />}</div>
              <div className={clsx("space-y-2.5", col === 1 && "max-h-[460px] overflow-y-auto pr-2 print:max-h-none")}>
                {pts.map((s, i) => (
                  <div key={i} className={clsx("border-l-2 pl-3", s.kind === "live" ? "border-accent" : s.kind === "morning" ? "border-blue" : s.kind === "now" ? "border-green" : "border-line")}>
                    <div className="flex flex-wrap items-center gap-2 text-xs"><span className="mono text-dim">{s.date === "morning" ? "this morning" : s.date || "·"}</span>{s.kind === "live" && <Pill level="amber">live</Pill>}</div>
                    <div className="text-sm font-medium">{s.title}</div>
                    {s.detail && <div className="mt-0.5 line-clamp-3 text-xs text-muted">{s.detail}</div>}
                    <div className="mt-1"><Cite ids={s.cite} max={2} /></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Unlock map */}
      <Panel title="Unlock map" hint="if we deliver this, what unlocks next: a person, usage, proof, money, expansion">
        <div className="space-y-5">
          {p.chains.map((c) => (
            <div key={c.id} className="break-inside-avoid">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="font-medium">{c.title} <span className="mono text-[10.5px] text-dim">{c.id}</span></div>
                <div className="text-sm"><span className="mono">{fmtMoney(c.value)}</span> <Pill level={c.value.basis === "backed" ? "green" : c.value.basis === "told" ? "amber" : "red"}>{c.value.basis}</Pill></div>
              </div>
              <div className="mt-0.5 text-xs text-muted">{c.why}</div>
              <div className="mt-2 flex flex-wrap items-stretch gap-1.5">
                {c.steps.map((s, i) => (
                  <div key={s.id} className="flex items-stretch gap-1.5">
                    <div className={clsx("w-[190px] border p-2", s.status === "done" ? "border-green/50 bg-[var(--green-soft)]" : s.status === "at-risk" ? "border-amber/50 bg-[var(--amber-soft)]" : s.status === "blocked" ? "border-red/40" : s.status === "hypothesis" ? "border-dashed border-line" : "border-line bg-bg")}>
                      <div className="flex items-center justify-between gap-1"><span className="label !text-[9px]">{i + 1} · {KIND_LABEL[s.kind]}</span><Pill level={STATUS_LEVEL[s.status]}>{s.status}</Pill></div>
                      <div className="mt-1 text-[12.5px] font-medium leading-snug">{s.label}</div>
                      <div className="mt-1 text-[10.5px] text-muted">{s.owner}{s.due ? ` · ${fmtDate(s.due)}` : ""}</div>
                      {s.kind === "expansion" && guards.length > 0 && <div className="mt-1 flex items-center gap-1 text-[10.5px] text-amber"><TriangleAlert size={11} />fix and prove first</div>}
                      <div className="mt-1"><Cite ids={s.cite} max={1} /></div>
                    </div>
                    {i < c.steps.length - 1 && <ArrowRight size={14} className="self-center text-dim" />}
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs"><span className="text-accent">Unlocks:</span> {c.unlocks}{c.upside ? <span className="text-muted"> · Upside: {c.upside}</span> : null}</div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Segments */}
      <Panel title={acc.id === "A" ? "Force by force" : "Plant groups"} hint="what we know · what we can give · what we can build">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {p.segments.map((s) => <SegmentCard key={s.id} s={s} />)}
        </div>
      </Panel>

      {/* Plan horizons */}
      <Panel title="The plan" hint="prerequisites first; each step dated inside its deadline">
        <div className="grid gap-4 lg:grid-cols-3">
          {HORIZONS.map((h) => {
            const items = p.plan.filter((x) => x.horizon === h.id);
            return (
              <div key={h.id}>
                <div className="label">{h.label} <span className="mono text-dim">({items.length})</span></div>
                <div className="mb-2 text-[11px] text-dim">{h.hint}</div>
                <div className="space-y-2">
                  {items.map((x) => (
                    <div key={x.stepId} className="border border-line bg-bg p-2.5">
                      <div className="flex items-center justify-between gap-2"><span className="text-[13px] font-medium">{x.title}</span><Pill level={STATUS_LEVEL[x.status]}>{x.status}</Pill></div>
                      <div className="mt-0.5 text-[11px] text-muted">{x.owner} · by {fmtDate(x.due)} · {KIND_LABEL[x.kind]}</div>
                      <div className="mt-0.5 text-[11px] text-dim">→ {x.chainTitle}</div>
                    </div>
                  ))}
                  {items.length === 0 && <div className="text-xs text-muted">Nothing here.</div>}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {(guards.length > 0 || acc.lessons.lessons.length > 0) && (
        <Panel title="Lessons applied to this plan" hint="mistakes we will not repeat (see Playbook)">
          <div className="space-y-2">
            {guards.map((g, i) => <div key={i} className="flex items-start gap-2 text-sm"><TriangleAlert size={14} className="mt-0.5 shrink-0 text-amber" /><span>{g.warning} <Cite ids={[g.lessonId]} /></span></div>)}
            {acc.lessons.lessons.slice(0, 4).map((l) => <div key={l.id} className="text-sm"><span className={l.kind === "worked" ? "text-green" : "text-amber"}>{l.kind === "worked" ? "Keep doing:" : "Don't repeat:"}</span> {l.rule} <Cite ids={[l.id]} /></div>)}
          </div>
        </Panel>
      )}
    </div>
  );
}

function SegmentCard({ s }: { s: Segment }) {
  const lvl = s.state === "flying" ? "green" : s.state === "fading" ? "amber" : s.state === "unknown" ? "grey" : "red";
  return (
    <div className="border border-line bg-bg p-3">
      <div className="flex items-center justify-between gap-2"><span className="font-medium">{s.name}</span><Pill level={lvl}>{s.state}</Pill></div>
      <div className="mono mt-1 text-xs text-muted">{s.docks ?? "?"} docks{s.live != null ? ` · ${s.live} live` : ""}{s.missions != null ? ` · ${s.missions} missions` : ""}{s.training ? ` · ${s.training} training` : ""}</div>
      {([["We know", s.know, "text-text/85"], ["We can give", s.give, "text-accent"], ["We can build", s.build, "text-green"]] as const).map(([t, xs, c]) => (
        <div key={t} className="mt-2">
          <div className="label !text-[9px]">{t}</div>
          <ul className="mt-0.5 space-y-0.5 text-[12px]">{xs.map((x, i) => <li key={i} className={c}>· {x}</li>)}</ul>
        </div>
      ))}
      <div className="mt-2"><Cite ids={s.cite} max={3} /></div>
    </div>
  );
}
