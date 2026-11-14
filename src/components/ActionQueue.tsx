"use client";
// The to-do list across both accounts: every ranked move, editable. Changes are written back to the
// game as task notes (see ops.tsx) and read back through list_notes.
import { useMemo, useState } from "react";
import clsx from "clsx";
import type { CrmView, Move } from "@/lib/types";
import { AnswerBanner, Cite, EmptyState, Panel, Pill, fmtDate, fmtMoney } from "./ui";
import { MoveActions, StatusPill, useOps } from "./ops";

type Row = Move & { acc: string };

export function ActionQueue({ crm }: { crm: CrmView }) {
  const ops = useOps();
  const [acc, setAcc] = useState("all");
  const [owner, setOwner] = useState("all");
  const [show, setShow] = useState<"open" | "all">("open");
  const rows: Row[] = useMemo(
    () => crm.accounts.flatMap((a) => a.moves.map((m) => ({ ...ops.apply(m), acc: a.id }))).sort((x, y) => x.due.localeCompare(y.due) || y.score.total - x.score.total),
    [crm, ops],
  );
  const owners = [...new Set(rows.map((r) => r.owner))];
  const filtered = rows.filter((r) => (acc === "all" || r.acc === acc) && (owner === "all" || r.owner === owner) && (show === "all" || r.status === "open"));
  const open = rows.filter((r) => r.status === "open");
  const overdue = open.filter((r) => r.due <= crm.asOf);
  const thisWeek = open.filter((r) => r.score.daysLeft <= 7);
  const people = ["You (CSM)", ...ops.people.filter((p) => p !== "Sam" && p !== "Support desk"), "Support desk"];

  return (
    <div className="space-y-4">
      <AnswerBanner q="Monday" title="Action queue" answer={`${open.length} open moves across ${crm.accounts.length} accounts: ${overdue.length} due today or overdue, ${thisWeek.length} due this week, ${rows.length - open.length} done or snoozed. Every change here is written back to the game.`} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Open", open.length, ""], ["Due today / overdue", overdue.length, overdue.length ? "text-red" : ""], ["Due in 7 days", thisWeek.length, "text-amber"], ["Done / snoozed", rows.length - open.length, "text-green"]].map(([l, v, c]) => (
          <div key={l as string} className="border border-line bg-panel p-3"><div className="label">{l}</div><div className={clsx("mono mt-1 text-2xl", c as string)}>{v as number}</div></div>
        ))}
      </div>
      <Panel
        title="To do"
        hint="sorted by due date, then score"
        right={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select value={acc} onChange={(e) => setAcc(e.target.value)} className="border border-line bg-bg px-2 py-1"><option value="all">All accounts</option>{crm.accounts.map((a) => <option key={a.id} value={a.id}>{a.id} · {a.name}</option>)}</select>
            <select value={owner} onChange={(e) => setOwner(e.target.value)} className="border border-line bg-bg px-2 py-1"><option value="all">All owners</option>{owners.map((o) => <option key={o}>{o}</option>)}</select>
            <select value={show} onChange={(e) => setShow(e.target.value as "open" | "all")} className="border border-line bg-bg px-2 py-1"><option value="open">Open only</option><option value="all">Include done / snoozed</option></select>
          </div>
        }
      >
        {filtered.length === 0 ? <EmptyState message="Nothing to do with these filters." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead><tr className="label border-b border-line text-left"><th className="py-2 font-normal">Move</th><th className="font-normal">Acct</th><th className="font-normal">Owner</th><th className="font-normal">Due</th><th className="text-right font-normal">Stake</th><th className="pl-3 font-normal">Status / actions</th></tr></thead>
              <tbody>
                {filtered.map((m) => {
                  const raw = crm.accounts.find((a) => a.id === m.acc)!.moves.find((x) => x.id === m.id)!;
                  const accView = crm.accounts.find((a) => a.id === m.acc)!;
                  const late = m.status === "open" && m.due <= crm.asOf;
                  return (
                    <tr key={m.id} className={clsx("border-b border-line/60 align-top", m.status !== "open" && "opacity-60")}>
                      <td className="py-2.5 pr-3">
                        <div className={clsx("font-medium", m.status === "done" && "line-through")}>{m.title}</div>
                        <div className="mt-0.5 text-[11px] text-dim">{m.why}</div>
                        <div className="mt-1"><Cite ids={m.cite} max={3} /></div>
                      </td>
                      <td><Pill level="amber">{m.acc}</Pill></td>
                      <td>
                        <select value={m.owner} onChange={(e) => ops.updateMove(raw, m.acc, { owner: e.target.value }, "reassigned")} className="max-w-[150px] border border-line bg-bg px-1.5 py-1 text-xs">
                          {[...new Set([m.owner, ...people])].map((p) => <option key={p}>{p}</option>)}
                        </select>
                        {m.owner !== m.plannedOwner && <div className="mt-0.5 text-[10.5px] text-dim">rules said {m.plannedOwner}</div>}
                      </td>
                      <td>
                        <input type="date" value={m.due} onChange={(e) => e.target.value && ops.updateMove(raw, m.acc, { due: e.target.value }, "due date changed")} className={clsx("mono border border-line bg-bg px-1.5 py-1 text-xs", late && "border-red/60 text-red")} />
                        <div className="mt-0.5 text-[10.5px] text-dim">{late ? "overdue" : `${m.score.daysLeft}d left`}{m.due !== m.plannedDue ? ` · was ${fmtDate(m.plannedDue)}` : ""}</div>
                      </td>
                      <td className="mono text-right text-xs">{fmtMoney({ amount: m.score.stake, currency: m.score.currency })}<div className="text-[10.5px] text-dim">× {m.score.confidence}</div></td>
                      <td className="pl-3">
                        <div className="mb-1"><StatusPill status={m.status} /></div>
                        <MoveActions m={raw} account={m.acc} acc={accView} />
                        {m.history.length > 0 && <div className="mt-1 text-[10.5px] text-dim">{m.history.length} update{m.history.length > 1 ? "s" : ""} in the game</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
