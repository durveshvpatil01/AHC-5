"use client";
// Every risk across the portfolio on one screen, ordered by when it turns bad.
import clsx from "clsx";
import type { CrmView } from "@/lib/types";
import { AnswerBanner, Cite, Panel, Pill, fmtDate } from "./ui";

export function RiskRadar({ crm, go }: { crm: CrmView; go: (k: string) => void }) {
  const rows = crm.accounts.flatMap((a) => a.risks.map((r) => ({ ...r, acc: a.id })));
  const order = { red: 0, amber: 1, green: 2, grey: 3 } as const;
  rows.sort((x, y) => order[x.level] - order[y.level] || (x.turnsBadOn ?? "9999").localeCompare(y.turnsBadOn ?? "9999"));
  const reds = rows.filter((r) => r.level === "red").length;
  const overdue = rows.filter((r) => r.turnsBadOn && r.turnsBadOn <= crm.asOf).length;
  return (
    <div className="space-y-4">
      <AnswerBanner q="Q4" title="Risk radar: both accounts" answer={`${reds} red and ${rows.length - reds} amber risks; ${overdue} have already turned bad. Sorted by colour, then the date each turns bad.`} />
      <Panel title="All risks" hint="click an account tag to open it">
        <div className="divide-y divide-line">
          {rows.map((r) => (
            <div key={r.id} className="grid gap-2 py-3 md:grid-cols-[70px_60px_1fr_140px]">
              <div><Pill level={r.level}>{r.level}</Pill></div>
              <button onClick={() => go(r.acc)} className="text-left"><Pill level="amber">Acct {r.acc}</Pill></button>
              <div>
                <div className="font-medium">{r.title}</div>
                <div className="mt-0.5 text-sm text-muted">{r.detail}</div>
                <div className="mt-1 text-[11px] text-dim">{r.rule}</div>
                <div className="mt-1"><Cite ids={r.cite} max={4} /></div>
              </div>
              <div className="text-xs md:text-right">
                <div className="label">Turns bad</div>
                <div className={clsx("mono", r.turnsBadOn && r.turnsBadOn <= crm.asOf ? "text-red" : "text-text")}>{r.turnsBadOn ? fmtDate(r.turnsBadOn) : "date not on file"}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
