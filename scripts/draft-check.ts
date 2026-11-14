import fs from "node:fs";
import { buildCrm } from "../src/lib/engine";
const j = (f: string) => JSON.parse(fs.readFileSync("data/snapshot/" + f, "utf8"));
const crm = buildCrm({ exp: j("export.json"), packs: [j("pack_A.json"), j("pack_B.json")], signals: j("signals.json").signals, notes: [{ id: "1", title: "task:A-M-EVENT", text: "status=done; by=CSM", at: "2026-11-14 10:00" }, { id: "2", title: "task:B-M-FINANCE", text: "status=open; owner=Achal Negi; due=2026-12-02", at: "2026-11-14 10:01" }], team: [], sync: {} as any });
for (const a of crm.accounts) {
  console.log("##", a.id, a.answers.first);
  a.moves.forEach((m) => console.log(" ", m.rank, m.status, m.owner, m.due, m.id, "| draft:", m.draft?.subject, "| cites ok:", (m.draft?.cite ?? []).every((c) => crm.sources[c])));
}
