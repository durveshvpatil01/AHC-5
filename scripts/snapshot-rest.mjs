// Pull everything once via the REST addresses + the MCP-only tools, 62s apart (1 call/min/token).
import fs from "node:fs";
import path from "node:path";
import { loadEnv, callTool } from "./mcp.mjs";

loadEnv();
const BASE = "https://questathon.aihackerscollective.com/api/public/v1";
const OUT = path.resolve("data/snapshot");
fs.mkdirSync(OUT, { recursive: true });

const jobs = [
  ["pack_A.json", () => rest("/pack/A/all")],
  ["pack_B.json", () => rest("/pack/B/all")],
  ["signals.json", () => rest("/signals")],
  ["schema.json", () => rest("/schema")],
  ["team.json", () => callTool("get_flytbase_team")],
  ["feature_requests.json", () => callTool("get_feature_requests")],
  ["release_notes.json", () => callTool("get_release_notes")],
  ["notes.json", () => rest("/notes")],
  ["me.json", () => rest("/me")],
];

async function rest(p) {
  const r = await fetch(BASE + p, { headers: { authorization: `Bearer ${process.env.AQ_TOKEN}` } });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${t.slice(0, 200)}`);
  return JSON.parse(t);
}

const only = process.argv.slice(2);
let first = true;
for (const [file, fn] of jobs) {
  if (only.length && !only.includes(file)) continue;
  if (!only.length && fs.existsSync(path.join(OUT, file))) { console.log("skip", file); continue; }
  if (!first) await new Promise((r) => setTimeout(r, 62_000));
  first = false;
  try {
    const data = await fn();
    fs.writeFileSync(path.join(OUT, file), JSON.stringify(data, null, 1));
    console.log(new Date().toISOString(), "saved", file, JSON.stringify(data).length);
  } catch (e) {
    console.log(new Date().toISOString(), "FAILED", file, e.message);
  }
}
console.log("done");
