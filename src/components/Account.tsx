"use client";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Check, Loader2, Send, Search } from "lucide-react";
import type { AccountView, CrmView, Move, Deal } from "@/lib/types";
import { Bar, BasisPill, Cite, Panel, Pill, Spark, StancePill, fmtDate, fmtMoney } from "./ui";

type T = "book" | "power" | "first" | "wrong" | "unknown" | "fleet" | "timeline" | "notes";

export function Account({ acc, crm }: { acc: AccountView; crm: CrmView }) {
  const [tab, setTab] = useState<T>("first");
  const k = acc.kpis;
  const notes = crm.notes.filter((n) => !n.account || n.account === acc.id);
  const tabs: [T, string, string | number][] = [
    ["book", "1 · Book", acc.deals.filter((d) => d.kind !== "offer").length],
    ["power", "2 · Power", acc.people.length],
    ["first", "3 · First moves", acc.moves.length],
    ["wrong", "4 · About to go wrong", acc.risks.filter((r) => r.level === "red").length + " red"],
    ["unknown", "5 · Unknowns", acc.gaps.length],
    ["fleet", "Fleet", `${k.active}/${k.docks}`],
    ["timeline", "Timeline", acc.timeline.length],
    ["notes", "Notes", notes.length],
  ];
  const answers: [T, string, string][] = [
    ["book", "What is the book worth?", acc.answers.book],
    ["power", "Who holds the power?", acc.answers.power],
    ["first", "What do we do first?", acc.answers.first],
    ["wrong", "What is about to go wrong?", acc.answers.wrong],
    ["unknown", "What do we still not know?", acc.answers.unknown],
  ];
  return (
    <div className="space-y-5">
      {/* header */}
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="border border-line bg-panel p-5">
          <div className="label">Account {acc.id} · {acc.sector} · {acc.currency}</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{acc.name}</h1>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="border border-line bg-bg p-3">
              <div className="label">The account sheet says (unverified)</div>
              <p className="mt-1 text-sm text-muted">{acc.officialStory}</p>
            </div>
            <div className="border border-accent/40 bg-[var(--accent-soft)] p-3">
              <div className="label !text-accent">The data says</div>
              <p className="mt-1 text-sm">{acc.dataStory}</p>
              <div className="mt-2"><Cite ids={acc.dataStoryCite} /></div>
            </div>
          </div>
        </div>
        <div className="border border-line bg-panel p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="label">Health score</div>
              <div className={clsx("mono text-4xl", k.health.score < 40 ? "text-red" : k.health.score < 65 ? "text-amber" : "text-green")}>{k.health.score}<span className="text-base text-dim">/100</span></div>
            </div>
            <div className="text-right">
              <div className="label">Renewal</div>
              <div className="mono text-xl">{fmtMoney(k.renewal)}</div>
              <div className="text-xs text-muted">{k.daysToRenewal} days · {fmtDate(k.termEnds)}</div>
              <div className="mt-1"><Cite ids={k.renewal.cite} max={1} /></div>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {k.health.parts.map((p) => (
              <div key={p.name}>
                <div className="flex justify-between text-xs"><span className="text-muted">{p.name} <span className="text-dim">×{p.weight}</span></span><span className="mono">{p.value}</span></div>
                <Bar parts={[{ value: p.value, color: p.value < 40 ? "var(--red)" : p.value < 65 ? "var(--amber)" : "var(--green)" }, { value: 100 - p.value, color: "transparent" }]} height={5} />
                <div className="text-[11px] text-dim">{p.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* five answers strip */}
      <div className="grid gap-2 md:grid-cols-5">
        {answers.map(([t, q, a], i) => (
          <button key={t} onClick={() => setTab(t)} className={clsx("border p-3 text-left transition", tab === t ? "border-accent bg-[var(--accent-soft)]" : "border-line bg-panel hover:border-accent/50")}>
            <div className="label !text-accent">Q{i + 1}</div>
            <div className="mt-0.5 text-[13px] font-semibold">{q}</div>
            <div className="mt-1 line-clamp-4 text-[12px] text-muted">{a}</div>
          </button>
        ))}
      </div>

      {/* tabs */}
      <div className="flex flex-wrap gap-0 border-b border-line">
        {tabs.map(([t, label, c]) => (
          <button key={t} onClick={() => setTab(t)} className={clsx("mono -mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-[11px] uppercase tracking-[0.12em]", tab === t ? "border-accent text-text" : "border-transparent text-muted hover:text-text")}>
            {label}
            <span className={clsx("rounded-sm px-1 text-[10px]", tab === t ? "bg-accent text-black" : "bg-white/5 text-muted")}>{c}</span>
          </button>
        ))}
      </div>

      {tab === "book" && <Book acc={acc} />}
      {tab === "power" && <Power acc={acc} />}
      {tab === "first" && (
        <Panel title="First moves" hint="score = stake × confidence ÷ (days left + 1); top 3 are this week's">
          <div className="divide-y divide-line">{acc.moves.map((m) => <MoveRow key={m.id} m={m} account={acc.id} expanded />)}</div>
        </Panel>
      )}
      {tab === "wrong" && <Risks acc={acc} />}
      {tab === "unknown" && <Gaps acc={acc} />}
      {tab === "fleet" && <Fleet acc={acc} />}
      {tab === "timeline" && <Timeline acc={acc} />}
      {tab === "notes" && <Notes acc={acc} notes={notes} />}
    </div>
  );
}

/* ---------------- Q1 book ---------------- */
function Book({ acc }: { acc: AccountView }) {
  const deals = acc.deals.filter((d) => d.kind !== "offer");
  const offers = acc.deals.filter((d) => d.kind === "offer");
  const backed = deals.filter((d) => d.value.basis === "backed" && d.value.amount != null);
  const apart = deals.filter((d) => d.value.basis !== "backed" || d.value.amount == null);
  return (
    <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
      <Panel title="Backed by a file" hint="contract, invoices or usage data">
        <DealTable deals={backed} />
      </Panel>
      <div className="space-y-4">
        <Panel title="Shown apart: cannot back yet" hint="told or claimed; not in any total">
          <DealTable deals={apart} compact />
        </Panel>
        <Panel title="Offers from the morning" hint="game value; won = to deliver">
          <div className="space-y-3">
            {offers.map((d) => (
              <div key={d.id} className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{d.title}</div>
                  <div className="text-xs text-muted">{d.value.note}</div>
                  <div className="mt-1"><Cite ids={d.value.cite} /></div>
                </div>
                <div className="text-right">
                  <div className="mono text-sm">{fmtMoney(d.value)}</div>
                  <Pill level={d.stage === "offer-won" ? "green" : "grey"}>{d.stage.replace("offer-", "")}</Pill>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function DealTable({ deals, compact }: { deals: Deal[]; compact?: boolean }) {
  return (
    <div className="divide-y divide-line">
      {deals.map((d) => (
        <div key={d.id} className="py-3 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{d.title}</span>
                <Pill>{d.stage}</Pill>
                <span className="mono text-[10.5px] text-dim">{d.id}</span>
              </div>
              {d.value.note && <div className="mt-1 text-xs text-muted">{d.value.note}</div>}
              {!compact && d.blocker && <div className="mt-1.5 text-xs"><span className="text-red">Blocker:</span> <span className="text-text/85">{d.blocker}</span> <Cite ids={d.blockerCite} /></div>}
              {compact && d.blocker && <div className="mt-1 text-xs text-muted">Blocker: {d.blocker}</div>}
              <div className="mt-1 text-xs"><span className="text-accent">Next:</span> <span className="text-text/85">{d.next}</span></div>
              {d.deadline && <div className="mt-1 text-xs text-muted">Deadline {fmtDate(d.deadline)}{d.deadlineText ? ` · ${d.deadlineText}` : ""}</div>}
              {!d.deadline && d.deadlineText && <div className="mt-1 text-xs text-amber">Deadline (date unknown): {d.deadlineText}</div>}
            </div>
            <div className="shrink-0 text-right">
              <div className="mono text-lg">{fmtMoney(d.value)}</div>
              <BasisPill basis={d.value.basis} />
              <div className="mt-1"><Cite ids={d.value.cite} max={2} /></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Q2 power ---------------- */
function Power({ acc }: { acc: AccountView }) {
  const deals = acc.deals.filter((d) => d.kind !== "offer");
  return (
    <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
      <Panel title="Power map per deal" hint="who decides, pays, signs, uses, could block, champions">
        <div className="space-y-5">
          {deals.map((d) => (
            <div key={d.id}>
              <div className="mb-2 flex items-center gap-2"><span className="font-medium">{d.title}</span><span className="mono text-[10.5px] text-dim">{d.id}</span></div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {d.seats.map((s, i) => (
                  <div key={i} className={clsx("border p-2.5", s.met ? "border-line bg-bg" : "border-dashed border-red/40 bg-[var(--red-soft)]/30")}>
                    <div className="flex items-center justify-between gap-2"><span className="label">{s.role}</span><StancePill stance={s.stance} /></div>
                    <div className={clsx("mt-1 text-sm", s.met ? "text-text" : "text-red")}>{s.met ? s.name : `UNKNOWN: ${s.name}`}</div>
                    {s.note && <div className="mt-1 text-[11.5px] text-muted">{s.note}</div>}
                    <div className="mt-1.5"><Cite ids={s.cite} max={2} /></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="People" hint="met this morning, and contacts on file">
        <div className="divide-y divide-line">
          {acc.people.map((p) => (
            <div key={p.id} className="py-2.5 first:pt-0">
              <div className="flex items-center justify-between gap-2"><span className="font-medium">{p.name}</span><StancePill stance={p.stance} /></div>
              <div className="text-xs text-muted">{p.role}</div>
              <div className="mt-1 text-[11.5px] text-text/75">{p.note}</div>
              <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-dim">
                {p.lastContact && <span>last contact {fmtDate(p.lastContact)}</span>}
                {p.signIns90 != null && <span>{p.signIns90} platform sign-ins / 90 days</span>}
              </div>
              <div className="mt-1"><Cite ids={p.cite.map((c) => (c.endsWith(".json") ? `${acc.id}:${c}` : c))} /></div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Q3 moves ---------------- */
export function MoveRow({ m, account, tag, expanded }: { m: Move; account: string; tag?: string; expanded?: boolean }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "err">("idle");
  const [err, setErr] = useState("");
  const save = async () => {
    setState("busy");
    try {
      const r = await fetch("/api/notes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ account, kind: "next_step", title: m.title, text: `${m.noteText} Owner: ${m.owner}. Due: ${m.due}. Deals: ${m.dealIds.join(", ")}. Evidence: ${m.cite.join(", ")}.` }) });
      const j = await r.json();
      if (j.ok) setState("done");
      else { setErr(j.error); setState("err"); }
    } catch (e) { setErr(String(e)); setState("err"); }
  };
  const late = m.score.daysLeft <= 1;
  return (
    <div className="flex gap-4 py-3.5 first:pt-0 last:pb-0">
      <div className={clsx("mono flex h-8 w-8 shrink-0 items-center justify-center border text-sm", m.rank <= 3 ? "border-accent bg-accent text-black" : "border-line text-muted")}>{m.rank}</div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {tag && <Pill level="amber">Acct {tag}</Pill>}
          <span className="font-medium">{m.title}</span>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span><span className="text-dim">Owner</span> <span className="text-text">{m.owner}</span>{m.helpers.length > 0 && <span className="text-muted"> + {m.helpers.join(", ")}</span>}</span>
          <span><span className="text-dim">Due</span> <span className={clsx("mono", late ? "text-red" : "text-text")}>{fmtDate(m.due)}</span> <span className="text-dim">({m.score.daysLeft}d)</span></span>
          <span><span className="text-dim">Moves</span> <span className="mono text-muted">{m.dealIds.join(", ")}</span></span>
        </div>
        {expanded && <p className="mt-1.5 text-sm text-text/80">{m.detail}</p>}
        <div className="mt-1.5 text-[11px] text-dim">{m.why} · stake {fmtMoney({ amount: m.score.stake, currency: m.score.currency })} × confidence {m.score.confidence}</div>
        <div className="mt-1.5"><Cite ids={m.cite} max={expanded ? 6 : 3} /></div>
      </div>
      <div className="shrink-0">
        <button onClick={save} disabled={state === "busy" || state === "done"} title="Write this as a next_step note into the game (write_note)" className={clsx("mono flex items-center gap-1.5 border px-2 py-1 text-[10.5px] uppercase tracking-wider", state === "done" ? "border-green/50 text-green" : state === "err" ? "border-red/50 text-red" : "border-line text-muted hover:border-accent hover:text-accent")}>
          {state === "busy" ? <Loader2 size={12} className="animate-spin" /> : state === "done" ? <Check size={12} /> : <Send size={12} />}
          {state === "done" ? "Saved" : state === "err" ? "Retry" : "Save to game"}
        </button>
        {state === "err" && <div className="mt-1 max-w-[160px] text-[10.5px] text-red">{err}</div>}
      </div>
    </div>
  );
}

/* ---------------- Q4 risks ---------------- */
function Risks({ acc }: { acc: AccountView }) {
  return (
    <Panel title="Risk radar" hint="red = act now · amber = this month · sorted by when it turns bad">
      <div className="divide-y divide-line">
        {acc.risks.map((r) => (
          <div key={r.id} className="grid gap-2 py-3 first:pt-0 md:grid-cols-[90px_1fr_150px]">
            <div><Pill level={r.level}>{r.level}</Pill></div>
            <div>
              <div className="font-medium">{r.title}</div>
              <div className="mt-0.5 text-sm text-muted">{r.detail}</div>
              <div className="mt-1 text-[11px] text-dim">{r.rule}</div>
              <div className="mt-1"><Cite ids={r.cite} max={4} /></div>
            </div>
            <div className="text-xs md:text-right">
              <div className="label">Turns bad</div>
              <div className={clsx("mono", r.turnsBadOn && r.turnsBadOn <= new Date().toISOString().slice(0, 10) ? "text-red" : "text-text")}>{r.turnsBadOn ? fmtDate(r.turnsBadOn) : "date not on file"}</div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ---------------- Q5 gaps ---------------- */
function Gaps({ acc }: { acc: AccountView }) {
  return (
    <Panel title="What we still do not know" hint="the gaps the plan rests on, and who could fill each">
      <div className="grid gap-3 md:grid-cols-2">
        {acc.gaps.map((g) => (
          <div key={g.id} className="border border-line bg-bg p-3">
            <div className="text-sm font-medium">{g.question}</div>
            <div className="mt-1 text-xs text-muted">{g.why}</div>
            <div className="mt-2 text-xs"><span className="text-dim">Who can tell us:</span> <span className="text-accent">{g.whoCanTell}</span></div>
            <div className="mt-1.5 flex items-center justify-between gap-2"><Cite ids={g.cite} /><span className="mono text-[10px] text-dim">{g.rule.split(":")[0]}</span></div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ---------------- fleet ---------------- */
function Fleet({ acc }: { acc: AccountView }) {
  const [f, setF] = useState<"all" | "active" | "low" | "dormant" | "never" | "flag">("all");
  const rows = acc.fleet.filter((d) => f === "all" || (f === "flag" ? d.flags.length > 0 : d.status === f));
  const color = { active: "var(--green)", low: "var(--amber)", dormant: "var(--red)", never: "#52525b" } as const;
  const k = acc.kpis;
  return (
    <Panel title="Fleet health" hint={`computed from weekly usage, flights and device events · last 12 weeks to ${fmtDate(acc.weeks[acc.weeks.length - 1])}`} right={<Cite ids={[`${acc.id}:usage_weekly.csv`, `${acc.id}:flights.csv`, `${acc.id}:device_events.csv`]} />}>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[["Installed", k.docks], ["Active (≥4 / 4 wks)", k.active], ["Low (1-3)", k.low], ["Stopped (0, flew before)", k.dormant], ["Never flown", k.never]].map(([l, v]) => (
          <div key={l as string} className="border border-line bg-bg p-3"><div className="label !text-[9.5px]">{l}</div><div className="mono text-2xl">{v}</div></div>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap gap-1">
        {(["all", "active", "low", "dormant", "never", "flag"] as const).map((x) => (
          <button key={x} onClick={() => setF(x)} className={clsx("mono border px-2 py-1 text-[10.5px] uppercase tracking-wider", f === x ? "border-accent text-accent" : "border-line text-muted")}>{x === "dormant" ? "stopped" : x === "flag" ? "flagged" : x}</button>
        ))}
        <span className="ml-auto text-xs text-muted">Flights last 4 wks <span className="mono text-text">{k.flightsLast4}</span> vs previous <span className="mono text-text">{k.flightsPrev4}</span></span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="label border-b border-line text-left">
              <th className="py-2 font-normal">Dock</th><th className="font-normal">Status</th><th className="font-normal">12-wk trend</th><th className="text-right font-normal">4 wks</th><th className="text-right font-normal">prev 4</th><th className="text-right font-normal">total</th><th className="pl-4 font-normal">Last flight</th><th className="font-normal">Flags</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.dockId} className="border-b border-line/60">
                <td className="py-1.5"><Cite ids={[d.dockId]} /></td>
                <td><span className="inline-flex items-center gap-1.5 text-xs"><span className="h-2 w-2" style={{ background: color[d.status] }} />{d.status === "dormant" ? "stopped" : d.status}</span></td>
                <td><Spark values={d.trend} color={color[d.status]} /></td>
                <td className="mono text-right">{d.last4}</td>
                <td className="mono text-right text-muted">{d.prev4}</td>
                <td className="mono text-right text-muted">{d.total}</td>
                <td className="mono pl-4 text-xs text-muted">{d.lastFlight ? fmtDate(d.lastFlight) : "never"}</td>
                <td className="text-xs text-amber">{d.flags.join(" · ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* ---------------- timeline ---------------- */
function Timeline({ acc }: { acc: AccountView }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const kinds = useMemo(() => ["all", ...new Set(acc.timeline.map((t) => t.kind))], [acc.timeline]);
  const rows = acc.timeline.filter((t) => (kind === "all" || t.kind === kind) && (!q || (t.title + t.who).toLowerCase().includes(q.toLowerCase())));
  return (
    <Panel title="Timeline" hint="calls, emails, tickets, internal notes and live events, newest first">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 border border-line bg-bg px-2 py-1"><Search size={13} className="text-dim" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-48 bg-transparent text-sm outline-none" /></div>
        {kinds.map((x) => <button key={x} onClick={() => setKind(x)} className={clsx("mono border px-2 py-1 text-[10.5px] uppercase tracking-wider", kind === x ? "border-accent text-accent" : "border-line text-muted")}>{x}</button>)}
      </div>
      <div className="divide-y divide-line">
        {rows.map((t, i) => (
          <div key={i} className={clsx("grid gap-2 py-2 md:grid-cols-[110px_80px_1fr_auto]", t.isNew && "bg-[var(--accent-soft)]")}>
            <span className="mono text-xs text-muted">{fmtDate(t.date)}</span>
            <span><Pill level={t.kind === "signal" ? "amber" : "grey"}>{t.kind}</Pill></span>
            <span className="text-sm"><span className="text-text/90">{t.title}</span> <span className="text-xs text-dim">· {t.who}</span></span>
            <Cite ids={[t.cite.includes("/") || t.cite.endsWith(".json") || t.cite.endsWith(".txt") ? `${acc.id}:${t.cite}` : t.cite]} />
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ---------------- notes (write-back) ---------------- */
function Notes({ acc, notes }: { acc: AccountView; notes: CrmView["notes"] }) {
  const [text, setText] = useState("");
  const [kind, setKind] = useState("note");
  const [msg, setMsg] = useState("");
  const send = async () => {
    setMsg("Saving…");
    const r = await fetch("/api/notes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ account: acc.id, kind, text }) });
    const j = await r.json();
    setMsg(j.ok ? "Saved to the game. It appears here on the next sync." : j.error);
    if (j.ok) setText("");
  };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Write back to the game" hint="write_note · 1 call a minute">
        <div className="space-y-2">
          <div className="flex gap-1">{["note", "task", "risk", "next_step"].map((k) => <button key={k} onClick={() => setKind(k)} className={clsx("mono border px-2 py-1 text-[10.5px] uppercase", kind === k ? "border-accent text-accent" : "border-line text-muted")}>{k}</button>)}</div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} className="w-full border border-line bg-bg p-2 text-sm outline-none focus:border-accent" placeholder={`A ${kind} on ${acc.name}…`} />
          <div className="flex items-center gap-3"><button onClick={send} disabled={!text.trim()} className="mono border border-accent bg-accent px-3 py-1.5 text-[11px] uppercase tracking-wider text-black disabled:opacity-40">Save</button><span className="text-xs text-muted">{msg}</span></div>
        </div>
      </Panel>
      <Panel title="Notes in the game" hint="list_notes">
        {notes.length === 0 ? <div className="text-sm text-muted">No notes written yet.</div> : (
          <div className="divide-y divide-line">{notes.map((n, i) => (
            <div key={n.id ?? i} className="py-2"><div className="flex items-center gap-2"><Pill>{n.kind ?? "note"}</Pill><span className="text-sm font-medium">{n.title}</span><span className="mono text-[10.5px] text-dim">{n.at}</span></div><div className="mt-1 text-sm text-muted">{n.text}</div></div>
          ))}</div>
        )}
      </Panel>
    </div>
  );
}
