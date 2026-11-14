// Shared MCP caller for local scripts. Reads AQ_TOKEN from .env.local (never committed).
import fs from "node:fs";
import path from "node:path";

export const MCP = "https://questathon.aihackerscollective.com/api/public/mcp";

export function loadEnv() {
  const p = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  if (!process.env.AQ_TOKEN) throw new Error("AQ_TOKEN missing: put it in aq-crm/.env.local");
}

export async function callTool(name, args = {}) {
  const res = await fetch(MCP, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      authorization: `Bearer ${process.env.AQ_TOKEN}`,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method: "tools/call", params: { name, arguments: args } }),
  });
  const raw = await res.text();
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    // SSE fallback: take the last data: line
    const data = raw.split("\n").filter((l) => l.startsWith("data:")).pop();
    body = data ? JSON.parse(data.slice(5)) : { error: { message: `HTTP ${res.status}: ${raw.slice(0, 200)}` } };
  }
  const { result, error } = body;
  if (error || result?.isError) throw new Error(error?.message ?? result?.content?.[0]?.text ?? `HTTP ${res.status}`);
  const text = result.content[0].text;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
