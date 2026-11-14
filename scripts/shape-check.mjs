import { loadEnv, callTool } from "./mcp.mjs";
loadEnv();
const keys = (o, d = 0) => (o && typeof o === "object" ? (Array.isArray(o) ? `[${o.length}] ` + (o[0] ? keys(o[0], d + 1) : "") : "{" + Object.keys(o).slice(0, 12).join(",") + "}") : typeof o);
for (const [name, args] of [["get_my_accounts", {}], ["get_all_paperwork", { account: "A" }]]) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await callTool(name, args);
      console.log(name, "top:", keys(r));
      if (r.accounts) console.log("  accounts[0]:", keys(r.accounts[0]));
      if (r.records) console.log("  records[0]:", keys(r.records[0]), "n=", r.records.length);
      break;
    } catch (e) { console.log(name, "ERR", e.message.slice(0, 120)); await new Promise((s) => setTimeout(s, 62000)); }
  }
  await new Promise((s) => setTimeout(s, 62000));
}
