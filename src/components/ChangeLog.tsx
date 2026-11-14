"use client";
// What the portal's MCP connection has brought in, and what each change did to the plan.
import type { CrmView } from "@/lib/types";
import type { SyncStatus } from "@/lib/sync";
import { AnswerBanner, Cite, EmptyState, Panel, Pill, fmtDate } from "./ui";

export function ChangeLog({ crm, sync }: { crm: CrmView; sync: SyncStatus }) {
  const signals = crm.accounts.flatMap((a) => a.signals.map((s) => ({ ...s, acc: a.id }))).sort((x, y) => y.dated.localeCompare(x.dated));
  const fails = sync.log.filter((l) => !l.ok).length;
  return (
    <div className="space-y-4">
      <AnswerBanner q="Live" title="Change log" answer={`${sync.changes.length} data change${sync.changes.length === 1 ? "" : "s"} pulled through the MCP since this server started, ${signals.length} live events merged into the accounts, ${sync.log.length} recent MCP calls (${fails} failed or rate-limited).`} />
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Data changes from the MCP" hint="diffed against the previous answer of the same tool">
          {sync.changes.length === 0 ? <EmptyState message="No changes since this server started. The first pull of each source is compared with the stored snapshot." /> : (
            <div className="space-y-3">
              {sync.changes.map((c, i) => (
                <div key={i} className="border-l-2 border-accent pl-3">
                  <div className="flex items-center gap-2 text-xs"><span className="mono text-dim">{new Date(c.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span><Pill level="amber">{c.tool}</Pill><span className="text-muted">{c.source}</span></div>
                  <ul className="mt-1 space-y-0.5 text-sm">{c.lines.map((l, j) => <li key={j}>· {l}</li>)}</ul>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Live events and what they changed" hint="get_signals → merged into the paperwork → re-scored">
          {signals.length === 0 ? <EmptyState message="No live events yet." /> : (
            <div className="space-y-4">
              {signals.map((s) => (
                <div key={s.id} className="border-l-2 border-amber pl-3">
                  <div className="flex items-center gap-2"><Pill level="amber">Acct {s.acc}</Pill><span className="mono text-xs text-muted">{fmtDate(s.dated)}</span><Cite ids={[s.id]} /></div>
                  <div className="mt-1 text-sm font-medium">{s.title.replace(/^[^:]+:\s*/, "")}</div>
                  <ul className="mt-1 space-y-0.5 text-xs">
                    {s.impact.map((x) => <li key={x} className={x.startsWith("Δ") ? "mono text-accent" : "text-text/80"}>{x.startsWith("Δ") ? x : `→ ${x}`}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
      <Panel title="MCP call log" hint={`${sync.endpoint} · one call a minute`}>
        {sync.log.length === 0 ? <EmptyState message="No calls on this server yet." /> : (
          <table className="w-full text-xs">
            <thead><tr className="label border-b border-line text-left"><th className="py-1.5 font-normal">Time</th><th className="font-normal">Tool</th><th className="font-normal">Result</th><th className="text-right font-normal">ms</th></tr></thead>
            <tbody>{sync.log.map((l, i) => (
              <tr key={i} className="border-b border-line/50"><td className="mono py-1 text-dim">{new Date(l.at).toLocaleTimeString("en-GB")}</td><td className="mono">{l.tool}{l.args !== "{}" ? ` ${l.args}` : ""}</td><td className={l.ok ? "text-muted" : "text-red"}>{l.ok ? "ok" : "failed"} {l.note}</td><td className="mono text-right text-dim">{l.ms}</td></tr>
            ))}</tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
