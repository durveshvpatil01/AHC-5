"use client";
// Discovery: what the morning found and how well it was tested. Every fact with who said it, when, how sure
// we are, what it unlocked, and each "official story" claim checked against the files.
import { useState } from "react";
import clsx from "clsx";
import { CheckCircle2, CircleHelp, Search, XCircle } from "lucide-react";
import type { CrmView } from "@/lib/types";
import { AnswerBanner, Cite, Panel, Pill, StancePill } from "./ui";

export function Discovery({ crm }: { crm: CrmView }) {
  const [accId, setAccId] = useState(crm.accounts[0]?.id ?? "A");
  const totals = crm.accounts.reduce(
    (t, a) => ({ facts: t.facts + a.discovery.counts.facts, verified: t.verified + a.discovery.counts.verified, claims: t.claims + a.discovery.counts.claim, contradicted: t.contradicted + a.discovery.tested.filter((x) => x.verdict === "contradicted").length, people: t.people + a.discovery.counts.people }),
    { facts: 0, verified: 0, claims: 0, contradicted: 0, people: 0 },
  );
  const acc = crm.accounts.find((a) => a.id === accId) ?? crm.accounts[0];
  const d = acc.discovery;
  const statusLevel = { verified: "green", told: "amber", claim: "red" } as const;
  return (
    <div className="space-y-4">
      <AnswerBanner
        q="Morning"
        title="Discovery: what we found, and how we know it"
        answer={`${totals.facts} facts learned from ${totals.people} people across ${crm.accounts.length} accounts. ${totals.claims} were claims, and every one was tested against the files: ${totals.contradicted} turned out false. The official stories ("13 of 15 plants flying", "all four forces keen") do not survive the data.`}
      />
      <div className="flex flex-wrap gap-1">
        {crm.accounts.map((a) => (
          <button key={a.id} onClick={() => setAccId(a.id)} className={clsx("mono border px-3 py-1.5 text-[11px] uppercase tracking-wider", a.id === acc.id ? "border-accent bg-[var(--accent-soft)] text-text" : "border-line text-muted hover:text-text")}>
            {a.id} · {a.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {[
          ["Facts learned", d.counts.facts, ""],
          ["Verified by a file", d.counts.verified, "text-green"],
          ["Told by a person", d.counts.told, "text-amber"],
          ["Claims (tested)", d.counts.claim, "text-red"],
          ["People met", d.counts.people, ""],
          ["Deals found", `${d.counts.dealsWithEvidence}/${d.counts.deals}`, ""],
          ["Offers won", `${d.counts.offersWon}/${d.counts.offersWon + d.counts.offersDeclined}`, d.counts.offersWon ? "text-green" : "text-muted"],
        ].map(([l, v, c]) => (
          <div key={l as string} className="border border-line bg-panel p-3"><div className="label !text-[9.5px]">{l}</div><div className={clsx("mono mt-1 text-2xl", c as string)}>{v}</div></div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Panel title="Stories tested against the data" hint="each claim in the official story, checked against a file">
          <div className="space-y-3">
            <div className="border border-line bg-bg p-3 text-sm"><span className="label">The account sheet said</span><p className="mt-1 text-muted">{acc.officialStory}</p></div>
            {d.tested.map((t) => (
              <div key={t.claimId} className={clsx("border-l-2 pl-3", t.verdict === "contradicted" ? "border-red" : t.verdict === "unsupported" ? "border-amber" : "border-line")}>
                <div className="flex flex-wrap items-center gap-2">
                  {t.verdict === "contradicted" ? <XCircle size={14} className="text-red" /> : t.verdict === "unsupported" ? <CircleHelp size={14} className="text-amber" /> : <Search size={14} className="text-muted" />}
                  <span className="text-sm font-medium">“{t.claim}”</span>
                  <span className="text-xs text-dim">{t.saidBy}</span>
                  <Pill level={t.verdict === "contradicted" ? "red" : t.verdict === "unsupported" ? "amber" : "grey"}>{t.verdict}</Pill>
                </div>
                <div className="mt-1 text-sm text-text/85">{t.finding}</div>
                <div className="mt-1"><Cite ids={t.cite} max={4} /></div>
              </div>
            ))}
            <div className="border border-accent/40 bg-[var(--accent-soft)] p-3 text-sm"><span className="label !text-accent">What the data says</span><p className="mt-1">{acc.dataStory}</p><div className="mt-1"><Cite ids={acc.dataStoryCite} /></div></div>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="People unlocked" hint="met in the morning, with where each stands">
            <div className="divide-y divide-line">
              {acc.people.map((p) => (
                <div key={p.id} className="flex items-start justify-between gap-3 py-2 first:pt-0">
                  <div><div className="text-sm font-medium">{p.name}</div><div className="text-xs text-muted">{p.role}</div></div>
                  <div className="flex items-center gap-2"><StancePill stance={p.stance} /><Cite ids={[p.id]} max={1} /></div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-muted">{d.counts.notOnFile} people or records the plan still needs are not on file (see Unknowns).</div>
          </Panel>
          <Panel title="Decision coverage" hint="have we met someone who decides and someone who pays?">
            <div className="space-y-2">
              {d.coverage.map((c) => (
                <div key={c.dealId} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-sm">
                  <span className="truncate">{c.title} <span className="mono text-[10.5px] text-dim">{c.dealId}</span></span>
                  <span className="flex items-center gap-1 text-xs">{c.deciderMet ? <CheckCircle2 size={13} className="text-green" /> : <XCircle size={13} className="text-red" />}decides</span>
                  <span className="flex items-center gap-1 text-xs">{c.payerMet ? <CheckCircle2 size={13} className="text-green" /> : <XCircle size={13} className="text-red" />}pays</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <Panel title="How the morning unfolded" hint={d.firstMinute != null ? `facts in the order they were learned, minute ${d.firstMinute} to ${d.lastMinute}` : "facts in order"}>
        <div className="divide-y divide-line">
          {d.facts.map((f) => (
            <div key={f.id} className="grid gap-2 py-2.5 md:grid-cols-[64px_110px_1fr_auto]">
              <span className="mono text-xs text-dim">{f.minute != null ? `min ${f.minute}` : "-"}</span>
              <span><Pill level={statusLevel[f.status]}>{f.status}</Pill></span>
              <div>
                <div className="text-sm">“{f.text}”</div>
                <div className="mt-0.5 text-xs text-muted">{f.saidBy}{f.verifiedBy ? <> · verified by <span className="mono">{f.verifiedBy}</span></> : null}{f.unlocks.length ? <> · unlocked <span className="mono text-accent">{f.unlocks.join(", ")}</span></> : null}</div>
              </div>
              <Cite ids={[f.id, ...(f.verifiedBy ? [f.verifiedBy] : [])]} max={2} />
            </div>
          ))}
        </div>
        {d.files.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2 text-xs"><span className="text-dim">Files won in the morning:</span><Cite ids={d.files.map((f) => f.id)} /></div>}
      </Panel>
    </div>
  );
}
