"use client";
import { useState } from "react";
import clsx from "clsx";
import { ArrowRight, Zap } from "lucide-react";
import type { CrmView } from "@/lib/types";
import { Bar, Cite, EmptyState, Panel, Pill, ShowAllToggle, fmtDate, fmtMoney } from "./ui";
import { MoveRow } from "./Account";

export function Portfolio({ crm, go, newSignalIds }: { crm: CrmView; go: (k: "A" | "B") => void; newSignalIds?: Set<string> }) {
  const [showAllMoves, setShowAllMoves] = useState(false);
  const [showAllSignals, setShowAllSignals] = useState(false);

  const allMoves = crm.accounts
    .flatMap((a) => a.moves.slice(0, 3).map((m) => ({ ...m, acc: a.id })))
    .sort((x, y) => x.due.localeCompare(y.due) || y.score.total - x.score.total);
  const moves = showAllMoves ? allMoves : allMoves.slice(0, 3);

  const allSignals = crm.accounts.flatMap((a) => a.signals).sort((x, y) => y.dated.localeCompare(x.dated));
  const signals = showAllSignals ? allSignals : allSignals.slice(0, 3);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="label">Book of business · Monday 9am view</div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
            Two renewals, both resting on one person, and half the fleet idle.
          </h1>
        </div>
        <div className="text-xs text-muted">
          Values stay in each contract&apos;s own currency. Nothing is converted or summed across accounts.
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {crm.accounts.map((a) => {
          const k = a.kpis;
          const reds = a.risks.filter((r) => r.level === "red").length;
          const healthColor = k.health.score < 40 ? "text-red" : k.health.score < 65 ? "text-amber" : "text-green";
          const healthBarColor = k.health.score < 40 ? "var(--red)" : k.health.score < 65 ? "var(--amber)" : "var(--green)";
          return (
            <div
              key={a.id}
              role="button"
              tabIndex={0}
              onClick={() => go(a.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  go(a.id);
                }
              }}
              className="group cursor-pointer border border-line bg-panel p-5 text-left transition hover:border-accent/70 hover:bg-panel-2/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="label">Account {a.id} · {a.sector}</div>
                  <div className="mt-1 text-lg font-semibold leading-snug">{a.name}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="label">Health</div>
                  <div className={clsx("mono text-3xl leading-none", healthColor)}>
                    {k.health.score}
                    <span className="text-xs text-dim">/100</span>
                  </div>
                </div>
              </div>

              <div className="mt-2.5">
                <Bar parts={[{ value: k.health.score, color: healthBarColor, label: `Health ${k.health.score}/100` }, { value: Math.max(0, 100 - k.health.score), color: "transparent" }]} height={4} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <Stat label="Renewal (backed)" value={fmtMoney(k.renewal)} sub={<Cite ids={k.renewal.cite} max={1} />} />
                <Stat
                  label="Term ends"
                  value={`${k.daysToRenewal} days`}
                  valueCls={k.daysToRenewal <= 60 ? "text-amber" : undefined}
                  sub={<span className="text-xs text-muted">{fmtDate(k.termEnds)}</span>}
                />
                <Stat
                  label="Red risks"
                  value={String(reds)}
                  valueCls={reds > 0 ? "text-red" : "text-green"}
                  sub={<span className="text-xs text-muted">{a.risks.length} total</span>}
                />
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1 text-xs text-muted">
                  <span>
                    Docks: <b className="text-text">{k.active}</b> active · {k.low} low · {k.dormant} stopped · {k.never} never flew
                  </span>
                  <span className="mono">{Math.round(k.utilisation * 100)}% in use</span>
                </div>
                <Bar
                  parts={[
                    { value: k.active, color: "var(--green)", label: `active (${k.active})` },
                    { value: k.low, color: "var(--amber)", label: `low (${k.low})` },
                    { value: k.dormant, color: "var(--red)", label: `stopped (${k.dormant})` },
                    { value: k.never, color: "#3f3f46", label: `never flew (${k.never})` },
                  ]}
                />
              </div>

              <div className="mt-4 space-y-1.5 border-t border-line/70 pt-3 text-sm">
                <p className="text-muted">
                  <span className="font-medium text-text">Sheet says:</span> {a.officialStory}
                </p>
                <div className="text-muted">
                  <span className="font-medium text-accent">Data says:</span> {a.dataStory}{" "}
                  <span className="ml-1 inline-block align-middle"><Cite ids={a.dataStoryCite} max={2} /></span>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-1 text-xs font-medium text-accent opacity-85 transition group-hover:translate-x-0.5 group-hover:opacity-100">
                Open the five answers <ArrowRight size={13} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="This week · first moves across both accounts" hint="ranked by due date, then stake × confidence">
          {moves.length === 0 ? (
            <EmptyState message="No moves queued for this week." />
          ) : (
            <>
              <div className="divide-y divide-line">
                {moves.map((m) => (
                  <MoveRow key={m.id} m={m} account={m.acc} tag={m.acc} />
                ))}
              </div>
              <ShowAllToggle shown={showAllMoves} total={allMoves.length} onToggle={() => setShowAllMoves((v) => !v)} label="moves" />
            </>
          )}
        </Panel>

        <Panel
          title="Live events"
          hint="from get_signals; merged into the data as they land"
          right={<Zap size={14} className="text-accent" />}
        >
          {signals.length === 0 ? (
            <EmptyState message="No live events yet. Polling every 30s." />
          ) : (
            <>
              <div className="space-y-3">
                {signals.map((s) => {
                  const isNew = newSignalIds?.has(s.id);
                  return (
                    <div
                      key={s.id}
                      className={clsx(
                        "border-l-2 pl-3 py-1 transition",
                        isNew ? "flash-new border-accent bg-[var(--accent-soft)] pr-2" : "border-accent/70"
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill level="amber">Acct {s.account}</Pill>
                        {isNew && <Pill level="green">New</Pill>}
                        <span className="mono text-xs text-muted">{fmtDate(s.dated)}</span>
                      </div>
                      <div className="mt-1 text-sm font-medium">{s.title.replace(/^[^:]+:\s*/, "")}</div>
                      <div className="mt-1 text-xs text-muted">{s.summary}</div>
                      {s.impact.length > 0 && (
                        <ul className="mt-2 space-y-0.5 text-xs">
                          {s.impact.map((x) => (
                            <li key={x} className="text-text/80">→ {x}</li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-1.5"><Cite ids={[s.id]} /></div>
                    </div>
                  );
                })}
              </div>
              <ShowAllToggle shown={showAllSignals} total={allSignals.length} onToggle={() => setShowAllSignals((v) => !v)} label="events" />
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value, valueCls, sub }: { label: string; value: string; valueCls?: string; sub?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="label !text-[9.5px]">{label}</div>
      <div className={clsx("mono mt-0.5 text-base sm:text-lg", valueCls ?? "text-text")}>{value}</div>
      <div className="mt-0.5">{sub}</div>
    </div>
  );
}
