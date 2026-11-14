// Fetch every read tool once and store it in data/snapshot/ (one call a minute, per the rules).
// Usage: node scripts/snapshot.mjs            -> fetch only what is missing
//        node scripts/snapshot.mjs --force    -> refetch everything
//        node scripts/snapshot.mjs get_signals whoami   -> fetch just these
import fs from "node:fs";
import path from "node:path";
import { loadEnv, callTool } from "./mcp.mjs";

loadEnv();
const OUT = path.resolve("data/snapshot");
fs.mkdirSync(OUT, { recursive: true });

const ALL = [
  ["whoami", {}],
  ["get_my_accounts", {}],
  ["get_all_paperwork", { account: "A" }],
  ["get_all_paperwork", { account: "B" }],
  ["get_signals", {}],
  ["get_data_format", {}],
  ["get_flytbase_team", {}],
  ["get_feature_requests", {}],
  ["get_release_notes", {}],
  ["list_notes", {}],
];

const args = process.argv.slice(2);
const force = args.includes("--force");
const only = args.filter((a) => !a.startsWith("--"));
const jobs = ALL.filter(([n]) => only.length === 0 || only.includes(n));

const fileFor = (name, a) => path.join(OUT, `${name}${a.account ? "_" + a.account : ""}.json`);
const GAP = 62_000;
let first = true;

for (const [name, a] of jobs) {
  const f = fileFor(name, a);
  if (!force && only.length === 0 && fs.existsSync(f)) {
    console.log("skip", path.basename(f));
    continue;
  }
  if (!first) {
    console.log(`waiting ${GAP / 1000}s (rate limit)...`);
    await new Promise((r) => setTimeout(r, GAP));
  }
  first = false;
  try {
    const data = await callTool(name, a);
    fs.writeFileSync(f, JSON.stringify({ fetchedAt: new Date().toISOString(), tool: name, args: a, data }, null, 2));
    console.log("saved", path.basename(f), `${JSON.stringify(data).length} bytes`);
  } catch (e) {
    console.error("FAILED", name, a, e.message);
  }
}
console.log("done");
