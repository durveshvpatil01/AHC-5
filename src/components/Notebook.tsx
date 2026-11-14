"use client";
// Notebook: the game's own notebook (Deals · Journal · Files · Deadlines · Rules), rebuilt from the MCP
// export so the CRM follows the journey in the game's vocabulary. Deals use the game's stage steps:
// Heard of → Blocker known → Owner found → Prepared → Sent → Agreed.
import { useState } from "react";
import clsx from "clsx";
import type { CrmView, Deal } from "@/lib/types";
import { AnswerBanner, Cite, Panel, Pill, StancePill, fmtDate, fmtMoney } from "./ui";

type Tab = "deals" | "journal" | "files" | "deadlines" | "rules";
const STEPS = ["Heard of", "Blocker known", "Owner found", "Prepared", "Sent", "Agreed"] as const;

/** How far a deal got in the game's own steps, from the export stage and what we hold. */
function stepsDone(d: Deal): number {
  if (d.stage === "agreed" || d.stage === "offer-won") return 6;
  if (d.stage === "cleared") return 5;
  if (d.stage === "qualified") return 3;
  const blockerKnown = !!d.blocker;
  const ownerFound = d.seats.some((s) => (s.role === "decides" || s.role === "signs") && s.met);
  return 1 + (blockerKnown ? 1 : 0) + (blockerKnown && ownerFound ? 1 : 0);
}

const GAME_RULES: [string, string][] = [
  ["Talking", "Walk up to someone and press E. The first conversation is an introduction: you only know their name and title. Pick a topic, then one of four replies; some move things on, some go nowhere, some close a line of questioning for good. No undo."],
  ["Relationships", "Guarded, Neutral, Warm or Ally. Good conversations build trust and open deeper topics; pushy or careless replies cost trust, and some put a deal at risk."],
  ["People you have not met", "Ask who decides, who pays and who signs off; a good conversation earns an introduction. FlytBase colleagues help when asked with a clear reason: which customer, what is blocked, why it matters."],
  ["Deals", "Identified → Qualified → Blocker cleared → Agreed. To clear a blocker, prepare the kind of thing the approver needs from up to 3 pieces of evidence, and send it to that one person (2 tries; a miss costs trust). To agree, call a meeting with everyone who decides and pays."],
  ["Offers", "Pitch to the right person once they trust you and have told you what they need. Too early: they say no, trust drops, and you wait."],
  ["As you play", "Files arrive after your next move. Each account moves on with your moves there; deadlines count moves. Insight rewards the question a good CSM would ask. Partway through, something changes."],
  ["The build", "Everything you found stays in the game; the CRM reads it live through the MCP with your personal token, and should take in whatever arrives during the build."],
];

export function Notebook({ crm }: { crm: CrmView }) {
  const [tab, setTab] = useState<Tab>("deals");
  const [accId, setAccId] = useState("all");
  const accs = crm.accounts.filter((a) => accId === "all" || a.id === accId);
  const facts = accs.flatMap((a) => a.discovery.facts.map((f) => ({ ...f, acc: a.id })));
  const tabs: [Tab, string, number | string][] = [
    ["deals", "Deals", accs.reduce((n, a) => n + a.deals.length, 0)],
    ["journal", "Journal", facts.length],
    ["files", "Files", accs.reduce((n, a) => n + a.discovery.files.length, 0)],
    ["deadlines", "Deadlines", ""],
    ["rules", "Rules", ""],
  ];
  return (
    <div className="space-y-4">
      <AnswerBanner q="Game" title="Notebook: the journey, as the game recorded it" answer={`The game's own notebook, rebuilt live from the MCP: ${accs.reduce((n, a) => n + a.deals.filter((d) => d.kind !== "offer").length, 0)} deals with how far each got, ${facts.length} journal entries in the order you learned them, the people you met, your files and every deadline.`} />
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map(([t, l, c]) => (
          <button key={t} onClick={() => setTab(t)} className={clsx("mono border px-3 py-1.5 text-[11px] uppercase tracking-wider", tab === t ? "border-accent bg-accent text-black" : "border-line text-muted hover:text-text")}>{l}{c !== "" ? ` ${c}` : ""}</button>
        ))}
        <span className="ml-auto flex gap-1">
          {["all", ...crm.accounts.map((a) => a.id)].map((id) => <button key={id} onClick={() => setAccId(id)} className={clsx("mono border px-2 py-1 text-[10.5px] uppercase", accId === id ? "border-accent text-accent" : "border-line text-muted")}>{id === "all" ? "Both" : `Acct ${id}`}</button>)}
        </span>
      </div>

      {tab === "deals" && accs.map((a) => (
        <Panel key={a.id} title={`${a.name} (${a.deals.filter((d) => d.kind !== "offer").length})`} hint={`Closed ${fmtMoney({ amount: a.kpis.offersWon, currency: "game$" })} in offers`}>
          <div className="space-y-3">
            {a.deals.filter((d) => d.kind !== "offer").map((d) => {
              const n = stepsDone(d);
              return (
                <div key={d.id} className="border border-line bg-bg p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{d.title}</span><span className="mono text-sm">{fmtMoney(d.value)} <span className="text-[10px] text-dim">{d.value.basis}</span></span></div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {STEPS.map((s, i) => <span key={s} className={clsx("mono border px-1.5 py-0.5 text-[10px] uppercase tracking-wider", i < n ? "border-amber/60 bg-[var(--amber-soft)] text-amber" : "border-line text-dim")}>{s}</span>)}
                  </div>
                  {d.blocker && <div className="mt-2 text-xs"><span className="text-red">Blocker:</span> {d.blocker} <Cite ids={d.blockerCite} max={2} /></div>}
                  <div className="mt-1 text-xs"><span className="text-accent">Next:</span> {d.next}</div>
                  {d.deadlineText && <div className="mt-1 text-xs text-muted">Deadline: {d.deadline ? fmtDate(d.deadline) + " · " : ""}{d.deadlineText}</div>}
                </div>
              );
            })}
            <div className="label mt-2">Offers you made</div>
            {a.deals.filter((d) => d.kind === "offer").map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 text-sm"><span>{d.title} <Cite ids={[d.id]} /></span><span className="flex items-center gap-2"><span className="mono">{fmtMoney(d.value)}</span><Pill level={d.stage === "offer-won" ? "green" : "red"}>{d.stage.replace("offer-", "")}</Pill></span></div>
            ))}
          </div>
        </Panel>
      ))}

      {tab === "journal" && (
        <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <Panel title="Journal" hint="what you learned, in the order you learned it (minute of the morning)">
            <div className="divide-y divide-line">
              {facts.sort((x, y) => (x.minute ?? 999) - (y.minute ?? 999)).map((f) => (
                <div key={f.id} className="grid gap-2 py-2 md:grid-cols-[60px_50px_90px_1fr_auto]">
                  <span className="mono text-xs text-dim">{f.minute != null ? `min ${f.minute}` : "-"}</span>
                  <span className="self-start"><Pill level="amber">{f.acc}</Pill></span>
                  <span className="self-start"><Pill level={f.status === "verified" ? "green" : f.status === "told" ? "amber" : "red"}>{f.status}</Pill></span>
                  <div className="text-sm">“{f.text}” <span className="text-xs text-muted">· {f.saidBy}{f.unlocks.length ? ` · unlocked ${f.unlocks.join(", ")}` : ""}</span></div>
                  <Cite ids={[f.id]} max={1} />
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Who you met" hint="the journey's people and where each stands">
            <div className="space-y-3">
              {accs.map((a) => (
                <div key={a.id}>
                  <div className="label">{a.name}</div>
                  {a.people.filter((p) => p.met).map((p) => (
                    <div key={p.id} className="mt-1.5 flex items-center justify-between gap-2 text-sm">
                      <span>{p.name} <span className="text-xs text-muted">· {p.role}</span></span>
                      <span className="flex items-center gap-2"><StancePill stance={p.stance} /><span className="mono text-[10.5px] text-dim">{a.discovery.facts.filter((f) => f.saidBy === p.name).length} facts</span></span>
                    </div>
                  ))}
                  <div className="mt-1 text-[11px] text-dim">{a.discovery.counts.notOnFile} people or records still not reached (see Unknowns).</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {tab === "files" && (
        <Panel title="Files" hint="won in the morning, plus the paperwork the portal pulls through the MCP">
          <div className="space-y-4">
            {accs.map((a) => {
              const recs = Object.values(crm.sources).filter((s) => s.kind === "record" && s.id.startsWith(`${a.id}:`));
              return (
                <div key={a.id}>
                  <div className="label">{a.name}</div>
                  <div className="mt-1 text-sm">Data room: {a.discovery.files.length ? <Cite ids={a.discovery.files.map((f) => f.id)} /> : <span className="text-muted">no files won on this account</span>}</div>
                  <div className="mt-1 text-sm">Paperwork ({recs.length} records): <Cite ids={recs.map((r) => r.id)} max={12} /></div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {tab === "deadlines" && (
        <Panel title="Deadlines" hint="from the game, the contracts and live events; date unknown where the game didn't say">
          <div className="divide-y divide-line">
            {accs.flatMap((a) => [
              ...(a.kpis.termEnds ? [{ acc: a.id, when: a.kpis.termEnds, what: `Contract term ends; no automatic renewal (${fmtMoney(a.kpis.renewal)})`, cite: a.kpis.renewal.cite }] : []),
              ...a.deals.filter((d) => d.deadlineText && d.kind !== "renewal").map((d) => ({ acc: a.id, when: d.deadline, what: `${d.title}: ${d.deadlineText}`, cite: [d.id] })),
              ...a.risks.filter((r) => r.turnsBadOn && /5 Dec|event|leaves|deputy|deadline/i.test(r.title + r.detail)).map((r) => ({ acc: a.id, when: r.turnsBadOn, what: r.title, cite: r.cite })),
            ]).sort((x, y) => (x.when ?? "9999").localeCompare(y.when ?? "9999")).map((d, i) => {
              const late = d.when && d.when <= crm.asOf;
              return (
                <div key={i} className="grid gap-2 py-2 md:grid-cols-[120px_50px_1fr_auto]">
                  <span className={clsx("mono text-xs", late ? "text-red" : d.when ? "text-text" : "text-amber")}>{d.when ? fmtDate(d.when) : "date not on file"}</span>
                  <span className="self-start"><Pill level="amber">{d.acc}</Pill></span>
                  <span className="text-sm">{d.what}</span>
                  <Cite ids={d.cite} max={2} />
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {tab === "rules" && (
        <Panel title="Rules of the game" hint="how the morning worked; the CRM's own rules (R-xx) are named next to everything they produce">
          <div className="grid gap-3 md:grid-cols-2">
            {GAME_RULES.map(([t, b]) => <div key={t} className="border border-line bg-bg p-3"><div className="label !text-accent">{t}</div><p className="mt-1 text-sm text-text/85">{b}</p></div>)}
          </div>
        </Panel>
      )}
    </div>
  );
}
