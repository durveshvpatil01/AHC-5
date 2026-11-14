"use client";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Loader2, Search, AlertTriangle } from "lucide-react";
import type { AccountView, CrmView, Move, Deal, Level } from "@/lib/types";
import { MoveActions, StatusPill, useOps } from "./ops";
import {
  AnswerBanner,
  Bar,
  BasisPill,
  Cite,
  EmptyState,
  Panel,
  Pill,
  ShowAllToggle,
  Spark,
  StancePill,
  fmtDate,
  fmtMoney,
} from "./ui";

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

  const healthColor = k.health.score < 40 ? "text-red" : k.health.score < 65 ? "text-amber" : "text-green";

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="border border-line bg-panel p-5">
          <div className="label">Account {acc.id} · {acc.sector} · {acc.currency}</div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{acc.name}</h1>
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
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="label">Health score</div>
              <div className={clsx("mono text-4xl", healthColor)}>
                {k.health.score}
                <span className="text-base text-dim">/100</span>
              </div>
            </div>
            <div className="text-right">
              <div className="label">Renewal</div>
              <div className="mono text-xl">{fmtMoney(k.renewal)}</div>
              <div className={clsx("text-xs", k.daysToRenewal != null && k.daysToRenewal <= 60 ? "text-amber" : "text-muted")}>
                {k.daysToRenewal != null ? `${k.daysToRenewal} days · ${fmtDate(k.termEnds)}` : "no contract on file"}
              </div>
              <div className="mt-1"><Cite ids={k.renewal.cite} max={1} /></div>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {k.health.parts.map((p) => (
              <div key={p.name}>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">
                    {p.name} <span className="text-dim">×{p.weight}</span>
                  </span>
                  <span className="mono">{p.value}</span>
                </div>
                <Bar
                  parts={[
                    { value: p.value, color: p.value < 40 ? "var(--red)" : p.value < 65 ? "var(--amber)" : "var(--green)" },
                    { value: Math.max(0, 100 - p.value), color: "transparent" },
                  ]}
                  height={5}
                />
                <div className="text-[11px] text-dim">{p.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* five answers hero strip */}
      <section aria-label="The five questions">
        <div className="mb-2 flex items-center justify-between">
          <span className="label">The five questions · click any card to inspect</span>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          {answers.map(([t, q, a], i) => {
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                aria-pressed={active}
                className={clsx(
                  "flex flex-col justify-between border p-3.5 text-left transition",
                  active ? "border-accent bg-[var(--accent-soft)]" : "border-line bg-panel hover:border-accent/60 hover:bg-panel-2/40"
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="mono rounded-sm bg-accent/15 px-1.5 py-[1px] text-[10px] font-semibold uppercase tracking-wider text-accent">
                      Q{i + 1}
                    </span>
                    {active && <span className="mono text-[9.5px] uppercase tracking-wider text-accent">Active</span>}
                  </div>
                  <div className="mt-1.5 text-[13.5px] font-semibold leading-snug">{q}</div>
                  <div className="mt-1.5 line-clamp-3 text-[12px] leading-relaxed text-muted">{a}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* tabs */}
      <div role="tablist" aria-label="Account sections" className="flex flex-wrap gap-0 border-b border-line">
        {tabs.map(([t, label, c]) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={clsx(
              "mono -mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-[11px] uppercase tracking-[0.12em] transition",
              tab === t ? "border-accent text-text" : "border-transparent text-muted hover:text-text"
            )}
          >
            {label}
            <span className={clsx("rounded-sm px-1 text-[10px]", tab === t ? "bg-accent text-black" : "bg-white/5 text-muted")}>{c}</span>
          </button>
        ))}
      </div>

      {tab === "book" && <Book acc={acc} />}
      {tab === "power" && <Power acc={acc} />}
      {tab === "first" && <FirstMoves acc={acc} />}
      {tab === "wrong" && <Risks acc={acc} asOf={crm.asOf} />}
      {tab === "unknown" && <Gaps acc={acc} />}
      {tab === "fleet" && <Fleet acc={acc} />}
      {tab === "timeline" && <Timeline acc={acc} />}
      {tab === "notes" && <Notes acc={acc} notes={notes} />}
    </div>
  );
}

/* ---------------- Q1 book ---------------- */
function Book({ acc }: { acc: AccountView }) {
  const [showAllBacked, setShowAllBacked] = useState(false);
  const [showAllApart, setShowAllApart] = useState(false);
  const deals = acc.deals.filter((d) => d.kind !== "offer");
  const offers = acc.deals.filter((d) => d.kind === "offer");
  const backedAll = deals.filter((d) => d.value.basis === "backed" && d.value.amount != null);
  const apartAll = deals.filter((d) => d.value.basis !== "backed" || d.value.amount == null);
  const backed = showAllBacked ? backedAll : backedAll.slice(0, 3);
  const apart = showAllApart ? apartAll : apartAll.slice(0, 3);

  return (
    <div className="space-y-4">
      <AnswerBanner q="Q1" title="What is the book worth?" answer={acc.answers.book} />
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="Backed by a file" hint="contract, invoices or usage data">
          {backed.length === 0 ? (
            <EmptyState message="No backed deals on file yet." />
          ) : (
            <>
              <DealTable deals={backed} />
              <ShowAllToggle shown={showAllBacked} total={backedAll.length} onToggle={() => setShowAllBacked((v) => !v)} label="deals" />
            </>
          )}
        </Panel>
        <div className="space-y-4">
          <Panel title="Shown apart: cannot back yet" hint="told or claimed; not in any total">
            {apart.length === 0 ? (
              <EmptyState message="All deals are backed by a file." />
            ) : (
              <>
                <DealTable deals={apart} compact />
                <ShowAllToggle shown={showAllApart} total={apartAll.length} onToggle={() => setShowAllApart((v) => !v)} label="deals" />
              </>
            )}
          </Panel>
          <Panel title="Offers from the morning" hint="game value; won = to deliver">
            {offers.length === 0 ? (
              <EmptyState message="No offers recorded." />
            ) : (
              <div className="space-y-3">
                {offers.map((d) => (
                  <div key={d.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{d.title}</div>
                      <div className="text-xs text-muted">{d.value.note}</div>
                      <div className="mt-1"><Cite ids={d.value.cite} /></div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="mono text-sm">{fmtMoney(d.value)}</div>
                      <Pill level={d.stage === "offer-won" ? "green" : "grey"}>{d.stage.replace("offer-", "")}</Pill>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
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
              {!compact && d.blocker && (
                <div className="mt-1.5 text-xs">
                  <span className="text-red">Blocker:</span> <span className="text-text/85">{d.blocker}</span> <Cite ids={d.blockerCite} />
                </div>
              )}
              {compact && d.blocker && <div className="mt-1 text-xs text-muted">Blocker: {d.blocker}</div>}
              <div className="mt-1 text-xs">
                <span className="text-accent">Next:</span> <span className="text-text/85">{d.next}</span>
              </div>
              {d.deadline && (
                <div className="mt-1 text-xs text-muted">
                  Deadline {fmtDate(d.deadline)}
                  {d.deadlineText ? ` · ${d.deadlineText}` : ""}
                </div>
              )}
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
const seatOrder = ["decides", "pays", "signs", "champions", "uses", "could block"] as const;

function Power({ acc }: { acc: AccountView }) {
  const deals = acc.deals.filter((d) => d.kind !== "offer");
  const stanceBorder = (stance: string, met: boolean) => {
    if (!met) return "border-dashed border-red/60 bg-[var(--red-soft)]/25";
    if (stance === "ally" || stance === "warm") return "border-green/35 bg-bg";
    if (stance === "neutral") return "border-amber/35 bg-bg";
    if (stance === "guarded") return "border-red/40 bg-bg";
    return "border-line bg-bg";
  };

  return (
    <div className="space-y-4">
      <AnswerBanner q="Q2" title="Who holds the power?" answer={acc.answers.power} />
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Power map per deal" hint="buying committee: decides / pays / signs · champions / uses / could block">
          {deals.length === 0 ? (
            <EmptyState message="No deals mapped." />
          ) : (
            <div className="space-y-6">
              {deals.map((d) => {
                const sorted = [...d.seats].sort((a, b) => seatOrder.indexOf(a.role) - seatOrder.indexOf(b.role));
                const unknownCount = sorted.filter((s) => !s.met).length;
                return (
                  <div key={d.id} className="border border-line bg-bg/40 p-3.5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{d.title}</span>
                        <Pill>{d.stage}</Pill>
                        <span className="mono text-[10.5px] text-dim">{d.id}</span>
                      </div>
                      {unknownCount > 0 && <Pill level="red">{unknownCount} unknown seat{unknownCount > 1 ? "s" : ""}</Pill>}
                    </div>
                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                      {sorted.map((s, i) => (
                        <div key={i} className={clsx("flex flex-col justify-between border p-2.5 transition", stanceBorder(s.stance, s.met))}>
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="label">{s.role}</span>
                              {s.met ? <StancePill stance={s.stance} /> : <Pill level="red">UNKNOWN</Pill>}
                            </div>
                            <div className={clsx("mt-1.5 text-sm font-medium", s.met ? "text-text" : "text-red")}>
                              {s.met ? s.name : s.name}
                            </div>
                            {s.note && <div className="mt-1 text-[11.5px] leading-snug text-muted">{s.note}</div>}
                          </div>
                          <div className="mt-2"><Cite ids={s.cite} max={2} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
        <Panel title="People" hint="met this morning, and contacts on file">
          {acc.people.length === 0 ? (
            <EmptyState message="No people recorded." />
          ) : (
            <div className="divide-y divide-line">
              {acc.people.map((p) => (
                <div key={p.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{p.name}</span>
                    <StancePill stance={p.stance} />
                  </div>
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
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Q3 moves ---------------- */
function FirstMoves({ acc }: { acc: AccountView }) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? acc.moves : acc.moves.slice(0, 3);
  return (
    <div className="space-y-4">
      <AnswerBanner q="Q3" title="What do we do first?" answer={acc.answers.first} />
      <Panel title="First moves" hint="score = stake × confidence ÷ (days left + 1); top 3 are this week's">
        {shown.length === 0 ? (
          <EmptyState message="No moves ranked yet." />
        ) : (
          <>
            <div className="divide-y divide-line">
              {shown.map((m) => (
                <MoveRow key={m.id} m={m} account={acc.id} acc={acc} expanded />
              ))}
            </div>
            <ShowAllToggle shown={showAll} total={acc.moves.length} onToggle={() => setShowAll((v) => !v)} label="moves" />
          </>
        )}
      </Panel>
    </div>
  );
}

export function MoveRow({ m: raw, account, tag, expanded, acc }: { m: Move; account: string; tag?: string; expanded?: boolean; acc?: AccountView }) {
  const ops = useOps();
  const m = ops.apply(raw);
  const late = m.status === "open" && m.score.daysLeft <= 1;
  return (
    <div className={clsx("flex flex-wrap gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-nowrap sm:gap-4", m.status !== "open" && "opacity-60")}>
      <div className={clsx("mono flex h-8 w-8 shrink-0 items-center justify-center border text-sm font-medium", m.status === "done" ? "border-green/50 text-green" : m.rank <= 3 && m.status === "open" ? "border-accent bg-accent text-black" : "border-line text-muted")}>
        {m.status === "done" ? "✓" : m.rank}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {tag && <Pill level="amber">Acct {tag}</Pill>}
          <span className={clsx("font-medium", m.status === "done" && "line-through decoration-dim")}>{m.title}</span>
          {m.status !== "open" && <StatusPill status={m.status} />}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span>
            <span className="text-dim">Owner</span> <span className="text-text">{m.owner}</span>
            {m.helpers.length > 0 && <span className="text-muted"> + {m.helpers.join(", ")}</span>}
          </span>
          <span>
            <span className="text-dim">Due</span>{" "}
            <span className={clsx("mono", late ? "font-semibold text-red" : "text-text")}>{fmtDate(m.due)}</span>{" "}
            <span className={clsx("mono", late ? "text-red" : "text-dim")}>({m.score.daysLeft}d)</span>
          </span>
          <span>
            <span className="text-dim">Moves</span> <span className="mono text-muted">{m.dealIds.join(", ")}</span>
          </span>
        </div>
        {expanded && <p className="mt-1.5 text-sm text-text/80">{m.detail}</p>}
        <div className="mt-1.5 text-[11px] text-dim">
          {m.why} · stake {fmtMoney({ amount: m.score.stake, currency: m.score.currency })} × confidence {m.score.confidence}
        </div>
        <div className="mt-1.5"><Cite ids={m.cite} max={expanded ? 6 : 3} /></div>
        {(m.warnings ?? []).map((w, i) => <div key={i} className="mt-1.5 border-l-2 border-amber pl-2 text-[11.5px] text-amber">Lesson: {w}</div>)}
        <div className="mt-2"><MoveActions m={raw} account={account} acc={acc} /></div>
      </div>
    </div>
  );
}

/* ---------------- Q4 risks ---------------- */
const levelOrder: Record<Level, number> = { red: 0, amber: 1, green: 2, grey: 3 };

function Risks({ acc, asOf }: { acc: AccountView; asOf: string }) {
  const [showAll, setShowAll] = useState(false);
  const sorted = useMemo(
    () =>
      [...acc.risks].sort(
        (a, b) =>
          levelOrder[a.level] - levelOrder[b.level] ||
          (a.turnsBadOn ?? "9999-12-31").localeCompare(b.turnsBadOn ?? "9999-12-31")
      ),
    [acc.risks]
  );
  const shown = showAll ? sorted : sorted.slice(0, 3);
  const refDate = asOf.slice(0, 10);

  return (
    <div className="space-y-4">
      <AnswerBanner q="Q4" title="What is about to go wrong?" answer={acc.answers.wrong} />
      <Panel title="Risk radar" hint="red = act now · amber = soon · sorted red → amber, then turns-bad date">
        {shown.length === 0 ? (
          <EmptyState message="No active risks flagged." />
        ) : (
          <>
            <div className="divide-y divide-line">
              {shown.map((r) => {
                const overdue = Boolean(r.turnsBadOn && r.turnsBadOn <= refDate);
                return (
                  <div
                    key={r.id}
                    className={clsx(
                      "grid gap-2 py-3 first:pt-0 last:pb-0 md:grid-cols-[90px_1fr_160px]",
                      r.level === "red" && "border-l-2 border-red pl-3"
                    )}
                  >
                    <div><Pill level={r.level}>{r.level}</Pill></div>
                    <div className="min-w-0">
                      <div className="font-medium">{r.title}</div>
                      <div className="mt-0.5 text-sm text-muted">{r.detail}</div>
                      <div className="mt-1 text-[11px] text-dim">{r.rule}</div>
                      <div className="mt-1"><Cite ids={r.cite} max={4} /></div>
                    </div>
                    <div className="text-xs md:text-right">
                      <div className="label">Turns bad</div>
                      <div className={clsx("mono mt-0.5 text-sm", overdue ? "font-semibold text-red" : "text-text")}>
                        {r.turnsBadOn ? fmtDate(r.turnsBadOn) : "date not on file"}
                      </div>
                      {overdue && <div className="mono text-[10px] uppercase tracking-wider text-red">Overdue</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            <ShowAllToggle shown={showAll} total={sorted.length} onToggle={() => setShowAll((v) => !v)} label="risks" />
          </>
        )}
      </Panel>
    </div>
  );
}

/* ---------------- Q5 gaps ---------------- */
function Gaps({ acc }: { acc: AccountView }) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? acc.gaps : acc.gaps.slice(0, 3);
  return (
    <div className="space-y-4">
      <AnswerBanner q="Q5" title="What do we still not know?" answer={acc.answers.unknown} />
      <Panel title="What we still do not know" hint="the gaps the plan rests on, and who could fill each">
        {shown.length === 0 ? (
          <EmptyState message="No open knowledge gaps." />
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              {shown.map((g) => (
                <div key={g.id} className="border border-line bg-bg p-3.5">
                  <div className="text-sm font-medium">{g.question}</div>
                  <div className="mt-1 text-xs text-muted">{g.why}</div>
                  <div className="mt-2 text-xs">
                    <span className="text-dim">Who can tell us:</span> <span className="font-medium text-accent">{g.whoCanTell}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <Cite ids={g.cite} />
                    <span className="mono text-[10px] text-dim">{g.rule.split(":")[0]}</span>
                  </div>
                </div>
              ))}
            </div>
            <ShowAllToggle shown={showAll} total={acc.gaps.length} onToggle={() => setShowAll((v) => !v)} label="gaps" />
          </>
        )}
      </Panel>
    </div>
  );
}

/* ---------------- fleet ---------------- */
function Fleet({ acc }: { acc: AccountView }) {
  const [f, setF] = useState<"all" | "active" | "low" | "dormant" | "never" | "flag">("all");
  const rows = acc.fleet.filter((d) => f === "all" || (f === "flag" ? d.flags.length > 0 : d.status === f));
  const color = { active: "var(--green)", low: "var(--amber)", dormant: "var(--red)", never: "#52525b" } as const;
  const k = acc.kpis;

  const counts = {
    all: acc.fleet.length,
    active: k.active,
    low: k.low,
    dormant: k.dormant,
    never: k.never,
    flag: acc.fleet.filter((d) => d.flags.length > 0).length,
  };

  const weeklyTotals = useMemo(
    () => acc.weeks.map((_, idx) => acc.fleet.reduce((sum, d) => sum + (d.trend[idx] ?? 0), 0)),
    [acc.fleet, acc.weeks]
  );

  return (
    <Panel
      title="Fleet health"
      hint={`computed from weekly usage, flights and device events · last 12 weeks to ${fmtDate(acc.weeks[acc.weeks.length - 1])}`}
      right={<Cite ids={[`${acc.id}:usage_weekly.csv`, `${acc.id}:flights.csv`, `${acc.id}:device_events.csv`]} />}
    >
      {/* KPI tiles */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {[
          ["Installed", k.docks, "text-text"],
          ["Active (≥4 / 4 wks)", k.active, "text-green"],
          ["Low (1–3)", k.low, "text-amber"],
          ["Stopped (0, flew before)", k.dormant, "text-red"],
          ["Never flown", k.never, "text-muted"],
        ].map(([l, v, cls]) => (
          <div key={l as string} className="border border-line bg-bg p-3">
            <div className="label !text-[9.5px]">{l}</div>
            <div className={clsx("mono mt-0.5 text-2xl", cls)}>{v}</div>
          </div>
        ))}
      </div>

      {/* Stacked bar + weekly flights SVG chart */}
      <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col justify-between border border-line bg-bg p-3.5">
          <div>
            <div className="label">Fleet split</div>
            <div className="mt-1 text-sm text-muted">
              <span className="mono text-text">{Math.round(k.utilisation * 100)}%</span> active ({k.active} of {k.docks} docks)
            </div>
          </div>
          <div className="my-3">
            <Bar
              height={12}
              parts={[
                { value: k.active, color: "var(--green)", label: `active (${k.active})` },
                { value: k.low, color: "var(--amber)", label: `low (${k.low})` },
                { value: k.dormant, color: "var(--red)", label: `stopped (${k.dormant})` },
                { value: k.never, color: "#52525b", label: `never flew (${k.never})` },
              ]}
            />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 bg-green" />Active {k.active}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 bg-amber" />Low {k.low}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 bg-red" />Stopped {k.dormant}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 bg-[#52525b]" />Never {k.never}</span>
          </div>
        </div>

        <div className="border border-line bg-bg p-3.5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="label">Weekly flights (sum across fleet)</span>
            <span className="text-xs text-muted">
              Last 4 wks <span className="mono text-text">{k.flightsLast4}</span> vs prev <span className="mono text-text">{k.flightsPrev4}</span>
            </span>
          </div>
          <WeeklyChart weeks={acc.weeks} totals={weeklyTotals} />
        </div>
      </div>

      {/* Filter chips */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {(["all", "active", "low", "dormant", "never", "flag"] as const).map((x) => (
          <button
            key={x}
            onClick={() => setF(x)}
            className={clsx(
              "mono flex items-center gap-1.5 border px-2.5 py-1 text-[10.5px] uppercase tracking-wider transition",
              f === x ? "border-accent bg-[var(--accent-soft)] text-accent" : "border-line text-muted hover:text-text"
            )}
          >
            <span>{x === "dormant" ? "stopped" : x === "flag" ? "flagged" : x}</span>
            <span className="text-dim">{counts[x]}</span>
          </button>
        ))}
      </div>

      {/* Dock table */}
      {rows.length === 0 ? (
        <EmptyState message="No docks match this filter." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="label border-b border-line text-left">
                <th className="py-2 font-normal">Dock</th>
                <th className="font-normal">Status</th>
                <th className="font-normal">12-wk trend</th>
                <th className="text-right font-normal">4 wks</th>
                <th className="text-right font-normal">prev 4</th>
                <th className="text-right font-normal">total</th>
                <th className="pl-4 font-normal">Last flight</th>
                <th className="font-normal">Flags</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const flagged = d.flags.length > 0;
                return (
                  <tr
                    key={d.dockId}
                    className={clsx(
                      "border-b border-line/60 transition hover:bg-white/[0.02]",
                      flagged && "bg-[var(--amber-soft)]/20"
                    )}
                  >
                    <td className={clsx("py-2", flagged && "border-l-2 border-amber pl-2")}>
                      <Cite ids={[d.dockId]} />
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className="h-2 w-2" style={{ background: color[d.status] }} />
                        {d.status === "dormant" ? "stopped" : d.status}
                      </span>
                    </td>
                    <td><Spark values={d.trend} color={color[d.status]} /></td>
                    <td className="mono text-right">{d.last4}</td>
                    <td className="mono text-right text-muted">{d.prev4}</td>
                    <td className="mono text-right text-muted">{d.total}</td>
                    <td className="mono pl-4 text-xs text-muted">{d.lastFlight ? fmtDate(d.lastFlight) : "never"}</td>
                    <td className="py-1.5">
                      {flagged ? (
                        <div className="flex flex-wrap gap-1">
                          {d.flags.map((fl) => (
                            <Pill key={fl} level={fl.includes("drop") || fl.includes("conn") ? "red" : "amber"}>
                              <AlertTriangle size={9} className="mr-1" />
                              {fl}
                            </Pill>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-dim">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function WeeklyChart({ weeks, totals }: { weeks: string[]; totals: number[] }) {
  if (!weeks.length || !totals.length) return <EmptyState message="No weekly usage data." />;
  const w = 560;
  const h = 110;
  const padB = 22;
  const padT = 10;
  const plotH = h - padB - padT;
  const max = Math.max(...totals, 1);
  const colW = w / totals.length;
  const barW = Math.max(8, colW * 0.58);

  const pts = totals
    .map((v, i) => {
      const cx = i * colW + colW / 2;
      const cy = padT + plotH - (v / max) * plotH;
      return `${cx.toFixed(1)},${cy.toFixed(1)}`;
    })
    .join(" ");

  const labelStep = totals.length > 8 ? 3 : 2;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[118px] w-full overflow-visible" role="img" aria-label="Weekly flights chart">
      {[0.25, 0.5, 0.75, 1].map((frac) => {
        const y = padT + plotH * (1 - frac);
        return <line key={frac} x1={0} y1={y} x2={w} y2={y} stroke="#2a2a2e" strokeDasharray="2 3" strokeWidth={1} />;
      })}
      {totals.map((v, i) => {
        const bh = Math.max(2, (v / max) * plotH);
        const x = i * colW + (colW - barW) / 2;
        const y = padT + plotH - bh;
        const showLabel = i === 0 || i === totals.length - 1 || i % labelStep === 0;
        return (
          <g key={weeks[i] ?? i}>
            <rect x={x} y={y} width={barW} height={bh} fill="var(--accent)" opacity={0.32} rx={1}>
              <title>{`${weeks[i]}: ${v} flights`}</title>
            </rect>
            {showLabel && (
              <text x={i * colW + colW / 2} y={h - 4} textAnchor="middle" fill="#8b8b92" fontSize={9.5} fontFamily="var(--font-mono)">
                {(weeks[i] ?? "").slice(5)}
              </text>
            )}
          </g>
        );
      })}
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth={1.8} />
    </svg>
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
        <div className="flex items-center gap-1.5 border border-line bg-bg px-2.5 py-1">
          <Search size={13} className="text-dim" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            aria-label="Search timeline"
            className="w-40 bg-transparent text-sm outline-none sm:w-52"
          />
        </div>
        {kinds.map((x) => (
          <button
            key={x}
            onClick={() => setKind(x)}
            className={clsx(
              "mono border px-2 py-1 text-[10.5px] uppercase tracking-wider transition",
              kind === x ? "border-accent bg-[var(--accent-soft)] text-accent" : "border-line text-muted hover:text-text"
            )}
          >
            {x}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState message="No timeline events match your filter." />
      ) : (
        <div className="divide-y divide-line">
          {rows.map((t, i) => (
            <div key={i} className={clsx("grid gap-2 py-2.5 first:pt-0 last:pb-0 md:grid-cols-[110px_84px_1fr_auto]", t.isNew && "bg-[var(--accent-soft)] px-2")}>
              <span className="mono text-xs text-muted">{fmtDate(t.date)}</span>
              <span><Pill level={t.kind === "signal" ? "amber" : "grey"}>{t.kind}</Pill></span>
              <span className="min-w-0 text-sm">
                <span className="text-text/90">{t.title}</span> <span className="text-xs text-dim">· {t.who}</span>
              </span>
              <Cite ids={[t.cite.includes("/") || t.cite.endsWith(".json") || t.cite.endsWith(".txt") ? `${acc.id}:${t.cite}` : t.cite]} />
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ---------------- notes (write-back) ---------------- */
function Notes({ acc, notes }: { acc: AccountView; notes: CrmView["notes"] }) {
  const [text, setText] = useState("");
  const [kind, setKind] = useState("note");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const send = async () => {
    setBusy(true);
    setMsg({ text: "Saving…" });
    try {
      const r = await fetch("/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ account: acc.id, kind, text }),
      });
      const j = await r.json();
      setMsg({ ok: j.ok, text: j.ok ? "Saved to the game. It appears here on the next sync." : j.error });
      if (j.ok) setText("");
    } catch (e) {
      setMsg({ ok: false, text: String(e) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Write back to the game" hint="write_note · 1 call a minute">
        <div className="space-y-2.5">
          <div className="flex flex-wrap gap-1">
            {["note", "task", "risk", "next_step"].map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={clsx(
                  "mono border px-2.5 py-1 text-[10.5px] uppercase transition",
                  kind === k ? "border-accent bg-[var(--accent-soft)] text-accent" : "border-line text-muted hover:text-text"
                )}
              >
                {k}
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            className="w-full border border-line bg-bg p-2.5 text-sm outline-none transition focus:border-accent"
            placeholder={`A ${kind} on ${acc.name}…`}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={send}
              disabled={!text.trim() || busy}
              className="mono inline-flex items-center gap-1.5 border border-accent bg-accent px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-black transition hover:opacity-90 disabled:opacity-40"
            >
              {busy && <Loader2 size={12} className="animate-spin" />}
              {busy ? "Saving…" : "Save"}
            </button>
            {msg && <span className={clsx("text-xs", msg.ok === false ? "text-red" : msg.ok ? "text-green" : "text-muted")}>{msg.text}</span>}
          </div>
        </div>
      </Panel>
      <Panel title="Notes in the game" hint="list_notes">
        {notes.length === 0 ? (
          <EmptyState message="No notes written yet." />
        ) : (
          <div className="divide-y divide-line">
            {notes.map((n, i) => (
              <div key={n.id ?? i} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill>{n.kind ?? "note"}</Pill>
                  <span className="text-sm font-medium">{n.title}</span>
                  <span className="mono text-[10.5px] text-dim">{n.at}</span>
                </div>
                <div className="mt-1 text-sm text-muted">{n.text}</div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
