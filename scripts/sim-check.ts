// Simulates what the organisers may send mid-build: an unknown event type and a brand-new account.
import fs from "node:fs";
import { buildCrm } from "../src/lib/engine";
const j = (f: string) => JSON.parse(fs.readFileSync("data/snapshot/" + f, "utf8"));
const exp = j("export.json");
exp.accounts.push({ id: "C", name: "Northgate Ports Authority", official_story: "Pilot planned.", stakeholders: [], facts: [], opportunities: [{ id: "c_pilot", title: "Pilot at the container terminal", stage: "identified", worth_up_to: null, size: null, blocker: null, evidence: [], deadline: null }], offers: [], deadlines: [] });
const signals = j("signals.json").signals.concat([
  { id: "plant7_complaint", account: "B", dated: "2026-12-03", title: "Aldermoor: Plant 7 asks to cancel its dock", summary: "Beatriz Alonso has written to group finance asking to stop paying for the Plant 7 dock from 1 January. Nobody has replied.", records: [
    { kind: "email", path: "B/emails/2026-12-03_beatriz_cancel.txt", text: "From: Beatriz Alonso\nSubject: Plant 7 dock\n\nPlease stop charging Plant 7 from 1 January.\n" },
    { kind: "request", path: "B/requests.csv", text: "request_id,opened,from,summary,status,owner,last_update,how_it_arrived\nFB-11400,2026-12-03,Plant 7,\"Asks to stop paying for the dock.\",Open,,2026-12-03,Email\n" } ] },
  { id: "c_opened", account: "C", dated: "2026-12-02", title: "Northgate Ports: a new account lands on your desk", summary: "A port authority has signed a pilot. The handover is due before 10 December.", records: [] },
]);
const crm = buildCrm({ exp, packs: [j("pack_A.json"), j("pack_B.json")], signals, notes: [], team: [], sync: {} as any });
console.log("asOf", crm.asOf, "accounts", crm.accounts.map((a) => a.id + ":" + a.name).join(" | "));
for (const a of crm.accounts) {
  console.log(`\n## ${a.id} health ${a.kpis.health.score} renewal ${a.kpis.renewal.amount} days ${a.kpis.daysToRenewal}`);
  a.signals.forEach((s) => console.log("  SIGNAL", s.id, "→", s.impact.join(" | ")));
  a.moves.slice(0, 4).forEach((m) => console.log("  MOVE", m.rank, m.title, "due", m.due));
  a.risks.filter((r) => r.rule.startsWith("R-SIGNAL")).forEach((r) => console.log("  RISK", r.level, r.title, r.turnsBadOn, r.cite.join(",")));
  const all = [...a.moves.flatMap((m) => m.cite), ...a.risks.flatMap((r) => r.cite), ...a.deals.flatMap((d) => [...d.value.cite, ...d.seats.flatMap((s) => s.cite)])];
  console.log("  MISSING:", [...new Set(all)].filter((c) => !crm.sources[c]).join(",") || "none");
}
