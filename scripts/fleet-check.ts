import fs from "node:fs";
import { fleetStats, mergeSignals } from "../src/lib/model";
const j = (f: string) => JSON.parse(fs.readFileSync("data/snapshot/" + f, "utf8"));
const p = mergeSignals(j("pack_B.json"), j("signals.json").signals);
const f = fleetStats(p);
console.log(f.weeks.slice(-6));
f.docks.forEach((d) => console.log(d.dockId, d.status, "L4", d.last4, "P4", d.prev4, "trend", d.trend.join(" "), d.flags.join("; ")));
