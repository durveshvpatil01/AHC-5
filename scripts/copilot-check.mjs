// Ask the Copilot questions and verify every [id] it cites exists in the CRM sources.
const BASE = process.argv[2] ?? "http://localhost:3101";
const crm = (await (await fetch(`${BASE}/api/crm?v=0`)).json()).crm;
const ids = new Set(Object.keys(crm.sources));
const qs = [
  "Why is Aldermoor's health score so low? Trace each part of the score.",
  "Is Rhys Calder's claim that all four forces are keen true?",
];
for (const q of qs) {
  const t0 = Date.now();
  const text = await (await fetch(`${BASE}/api/copilot`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: q }) })).text();
  const cited = [...text.matchAll(/\[([^\]]{1,120})\]/g)].map((m) => m[1]).filter((x) => x.split(/\s*[,;]\s*/).every((y) => /^\S+$/.test(y))).flatMap((x) => x.split(/\s*[,;]\s*/)).filter((id) => !/^[A-Z]+$/.test(id));
  const bad = cited.filter((id) => !ids.has(id));
  console.log(`\n### ${q}  (${((Date.now() - t0) / 1000).toFixed(1)}s)\n${text}\n--> ${cited.length} citations, ${bad.length} unknown${bad.length ? ": " + [...new Set(bad)].join(", ") : ""}`);
}
