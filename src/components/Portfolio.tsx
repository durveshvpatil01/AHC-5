"use client";
import { ArrowRight, Zap } from "lucide-react";
import type { CrmView } from "@/lib/types";
import { Bar, Cite, Panel, Pill, fmtDate, fmtMoney } from "./ui";
import { MoveRow } from "./Account";

export function Portfolio({ crm, go }: { crm: CrmView; go: (k: "A" | "B") => void }) {
  const moves = crm.accounts
    .flatMap((a) => a.moves.slice(0, 3).map((m) => ({ ...m, acc: a.id })))
    .sort((x, y) => x.due.localeCompare(y.due) || y.score.total - x.score.total);
  const signals = crm.accounts.flatMap((a) => a.signals).sort((x, y) => y.dated.localeCompare(x.dated));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="label">Book of business · Monday 9am view</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Two renewals, both resting on one person, and half the fleet idle.</h1>
        </div>
        <div className="text-xs text-muted">Values stay in each contract&apos;s own currency. Nothing is converted or summed across accounts.</div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {crm.accounts.map((a) => {
          const k = a.kpis;
          const reds = a.risks.filter((r) => r.level === "red").length;
          return (
            <div key={a.id} role="button" tabIndex={0} onClick={() => go(a.id)} onKeyDown={(e) => e.key === "Enter" && go(a.id)} className="group cursor-pointer border border-line bg-panel p-5 text-left transition hover:border-accent/60">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="label">Account {a.id} · {a.sector}</div>
                  <div className="mt-1 text-lg font-semibold">{a.name}</div>
                </div>
                <div className="text-right">
                  <div className="label">Health</div>
                  <div className={`mono text-3xl ${k.health.score < 40 ? "text-red" : k.health.score < 65 ? "text-amber" : "text-green"}`}>{k.health.score}</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <Stat label="Renewal (backed)" value={fmtMoney(k.renewal)} sub={<Cite ids={k.renewal.cite} max={1} />} />
                <Stat label="Term ends" value={`${k.daysToRenewal} days`} sub={<span className="text-xs text-muted">{fmtDate(k.termEnds)}</span>} />
                <Stat label="Red risks" value={String(reds)} sub={<span className="text-xs text-muted">{a.risks.length} total</span>} />
              </div>
              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-xs text-muted">
                  <span>Docks: <b className="text-text">{k.active}</b> active · {k.low} low · {k.dormant} stopped · {k.never} never flew</span>
                  <span className="mono">{Math.round(k.utilisation * 100)}% in use</span>
                </div>
                <Bar parts={[{ value: k.active, color: "var(--green)", label: "active" }, { value: k.low, color: "var(--amber)", label: "low" }, { value: k.dormant, color: "var(--red)", label: "stopped" }, { value: k.never, color: "#3f3f46", label: "never flew" }]} />
              </div>
              <p className="mt-4 text-sm text-muted"><span className="text-text">Sheet says:</span> {a.officialStory}</p>
              <p className="mt-1 text-sm text-muted"><span className="text-accent">Data says:</span> {a.dataStory}</p>
              <div className="mt-3 flex items-center gap-1 text-xs text-accent opacity-80 group-hover:opacity-100">Open the five answers <ArrowRight size={13} /></div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="This week · first moves across both accounts" hint="ranked by due date, then stake × confidence">
          <div className="divide-y divide-line">
            {moves.map((m) => (
              <MoveRow key={m.id} m={m} account={m.acc} tag={m.acc} />
            ))}
          </div>
        </Panel>
        <Panel title="Live events" hint="from get_signals; merged into the data as they land" right={<Zap size={14} className="text-accent" />}>
          <div className="space-y-4">
            {signals.length === 0 && <div className="text-sm text-muted">No live events yet.</div>}
            {signals.map((s) => (
              <div key={s.id} className="border-l-2 border-accent pl-3">
                <div className="flex items-center gap-2"><Pill level="amber">Acct {s.account}</Pill><span className="mono text-xs text-muted">{fmtDate(s.dated)}</span></div>
                <div className="mt-1 text-sm font-medium">{s.title.replace(/^[^:]+:\s*/, "")}</div>
                <div className="mt-1 text-xs text-muted">{s.summary}</div>
                <ul className="mt-2 space-y-0.5 text-xs">
                  {s.impact.map((x) => <li key={x} className="text-text/80">→ {x}</li>)}
                </ul>
                <div className="mt-1.5"><Cite ids={[s.id]} /></div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div>
      <div className="label !text-[9.5px]">{label}</div>
      <div className="mono mt-0.5 text-lg text-text">{value}</div>
      <div className="mt-0.5">{sub}</div>
    </div>
  );
}
