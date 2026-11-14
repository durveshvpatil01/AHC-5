import fs from "node:fs";
import { buildCrm } from "../src/lib/engine";
const j = (f: string) => JSON.parse(fs.readFileSync("data/snapshot/" + f, "utf8"));
const crm = buildCrm({ exp: j("export.json"), packs: [j("pack_A.json"), j("pack_B.json")], signals: j("signals.json").signals, notes: [], team: [], sync: {} as any });
console.log("asOf", crm.asOf, "sources", Object.keys(crm.sources).length);
for (const a of crm.accounts) {
  console.log("\n#####", a.id, a.name, "health", a.kpis.health.score, "docks", a.kpis.docks, "active", a.kpis.active, "low", a.kpis.low, "dormant", a.kpis.dormant, "never", a.kpis.never, "days to renewal", a.kpis.daysToRenewal);
  console.log("DATA:", a.dataStory);
  Object.entries(a.answers).forEach(([k, v]) => console.log(k.toUpperCase() + ":", v));
  a.risks.forEach((r) => console.log("RISK", r.level, r.title, "|", r.turnsBadOn));
  // citation integrity
  const all = [...a.deals.flatMap((d) => [...d.value.cite, ...d.blockerCite, ...d.seats.flatMap((s) => s.cite)]), ...a.moves.flatMap((m) => m.cite), ...a.risks.flatMap((r) => r.cite), ...a.gaps.flatMap((g) => g.cite), ...a.dataStoryCite, ...a.people.flatMap((p) => p.cite.map((c) => c.endsWith(".json") ? a.id + ":" + c : c))];
  const missing = [...new Set(all)].filter((c) => !crm.sources[c]);
  console.log("MISSING CITES:", missing.join(", ") || "none");
}
