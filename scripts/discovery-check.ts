import fs from "node:fs";
import { buildCrm } from "../src/lib/engine";
const j = (f: string) => JSON.parse(fs.readFileSync("tests/fixtures/" + f, "utf8"));
const crm = buildCrm({ exp: j("export.json"), packs: [j("pack_A.json"), j("pack_B.json")], signals: j("signals.json").signals, notes: [], team: [], sync: {} as any });
for (const a of crm.accounts) {
  const d = a.discovery;
  console.log("##", a.id, JSON.stringify(d.counts), "minutes", d.firstMinute, "-", d.lastMinute);
  d.tested.forEach((t) => console.log("  TEST", t.verdict, t.claimId, "|", t.finding, "| missing:", t.cite.filter((c) => !crm.sources[c]).join(",") || "none"));
  d.coverage.forEach((c) => console.log("  COVER", c.dealId, "decider", c.deciderMet, "payer", c.payerMet, "evidence", c.evidence));
  console.log("  unlocks:", d.facts.filter((f) => f.unlocks.length).map((f) => f.id + "->" + f.unlocks.join("+")).join(" "));
}
