import fs from "node:fs";
import { buildCrm } from "../src/lib/engine";
const j = (f: string) => JSON.parse(fs.readFileSync("tests/fixtures/" + f, "utf8"));
const crm = buildCrm({ exp: j("export.json"), packs: [j("pack_A.json"), j("pack_B.json")], signals: j("signals.json").signals, notes: [], team: [], sync: {} as any, files: { flight_log_force_month: j("file_flight_log_force_month.json") } });
for (const a of crm.accounts) {
  const p = a.plan;
  console.log("\n##", a.id, p.headline);
  p.segments.forEach((s) => console.log("  SEG", s.name, s.state, "docks", s.docks, "live", s.live, "missions", s.missions, "train", s.training));
  p.chains.forEach((c) => console.log("  CHAIN", c.id, c.value.amount, c.value.basis, "|", c.steps.map((s) => `${s.status}:${s.label.slice(0, 28)}`).join(" > ")));
  console.log("  PLAN 2w:", p.plan.filter((x) => x.horizon === "2w").map((x) => x.title.slice(0, 40) + "@" + x.due).join(" | "));
  console.log("  PLAN q :", p.plan.filter((x) => x.horizon === "quarter").length, " 12m:", p.plan.filter((x) => x.horizon === "12m").length);
  a.lessons.lessons.forEach((l) => console.log("  LESSON", l.kind, l.id, l.title));
  a.lessons.guards.forEach((g) => console.log("  GUARD", g.appliesTo, g.warning));
  const allC = [...p.chains.flatMap((c) => [...c.cite, ...c.value.cite, ...c.steps.flatMap((s) => s.cite)]), ...p.segments.flatMap((s) => s.cite), ...a.lessons.lessons.flatMap((l) => l.cite), ...p.story.start.flatMap((x) => x.cite), ...p.story.events.flatMap((x) => x.cite), ...p.story.now.flatMap((x) => x.cite)];
  console.log("  MISSING:", [...new Set(allC)].filter((c) => !crm.sources[c]).join(", ") || "none");
}
