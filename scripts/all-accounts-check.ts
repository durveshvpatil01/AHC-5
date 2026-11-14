// Mirrors load.ts on the snapshot: merges new accounts, normalises blockers, attaches files; checks every account.
import fs from "node:fs";
import { buildCrm } from "../src/lib/engine";
const S = "data/snapshot/";
const j = (f: string) => JSON.parse(fs.readFileSync(S + f, "utf8"));
const exp = j("export.json");
for (const f of fs.readdirSync(S).filter((x) => x.startsWith("new_"))) {
  const n = j(f);
  for (const a of n.accounts) if (!exp.accounts.some((x: { id: string }) => x.id === a.id)) exp.accounts.push(a);
  for (const fl of n.files ?? []) if (!exp.files.some((x: { id: string }) => x.id === fl.id)) exp.files.push(fl);
}
for (const a of exp.accounts) for (const o of a.opportunities) if (o.blocker && typeof o.blocker === "object") o.blocker = o.blocker.text;
const packs = fs.readdirSync(S).filter((x) => /^pack_[A-Z]\.json$/.test(x)).map(j);
const files: Record<string, unknown> = {};
for (const f of fs.readdirSync(S).filter((x) => x.startsWith("file_"))) files[f.slice(5, -5)] = j(f);
const crm = buildCrm({ exp, packs, signals: j("signals.json").signals, notes: [], team: [], sync: {} as any, files, featureRequests: j("feature_requests.json") } as any);
console.log("asOf", crm.asOf, "accounts", crm.accounts.map((a) => a.id).join(","), "packs", packs.map((p: { account: string }) => p.account).join(","));
for (const a of crm.accounts) {
  const ids = [
    ...a.deals.flatMap((d) => [...d.value.cite, ...d.blockerCite, ...d.seats.flatMap((s) => s.cite)]),
    ...a.moves.flatMap((m) => [...m.cite, ...(m.draft?.cite ?? [])]), ...a.risks.flatMap((r) => r.cite), ...a.gaps.flatMap((g) => g.cite),
    ...a.plan.chains.flatMap((c) => [...c.cite, ...c.steps.flatMap((s) => s.cite)]), ...a.lessons.lessons.flatMap((l) => l.cite),
  ];
  console.log(`## ${a.id} ${a.name} · health ${a.kpis.health.score} · deals ${a.deals.length} · moves ${a.moves.length} · risks ${a.risks.length} · gaps ${a.gaps.length} · plays ${a.plan.chains.length} · facts ${a.discovery.facts.length}`);
  console.log("   first:", a.answers.first.slice(0, 160));
  console.log("   MISSING:", [...new Set(ids)].filter((c) => !crm.sources[c]).join(", ") || "none");
}
console.log("file text attached:", ["h_flight_log_1iw", "K_install_note_1iw"].map((id) => id + "=" + (crm.sources[id]?.text ?? "").slice(0, 40).replace(/\n/g, " ")).join(" | "));
