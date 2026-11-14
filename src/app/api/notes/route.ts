// Write a note / task / risk / next_step back to the game through the portal's MCP connection (write_note).
import { guardedCall, noteWritten, reserveForWrite, secondsUntilNextCall } from "@/lib/sync";
import { clientIp, limit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const KINDS = new Set(["note", "task", "risk", "next_step"]);

export async function POST(req: Request) {
  const rl = limit(`notes:${clientIp(req)}`, 8, 10 * 60_000);
  if (!rl.ok) return Response.json({ ok: false, waitSec: rl.retryAfterSec, error: `Too many notes. Try again in ${rl.retryAfterSec}s.` }, { status: 429, headers: { "retry-after": String(rl.retryAfterSec) } });
  let body: { account?: string; kind?: string; title?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Bad JSON" }, { status: 400 });
  }
  const text = (body.text ?? "").toString().slice(0, 2000).trim();
  if (!text) return Response.json({ ok: false, error: "Text is required" }, { status: 400 });
  const wait = secondsUntilNextCall();
  if (wait > 0) {
    reserveForWrite(wait + 20);
    return Response.json({ ok: false, waitSec: wait, error: `One MCP call a minute: try again in ${wait}s.` }, { status: 429 });
  }
  const args: Record<string, unknown> = { text, kind: KINDS.has(body.kind ?? "") ? body.kind : "note" };
  if (body.account && /^[A-Z]$/.test(body.account)) args.account = body.account;
  if (body.title) args.title = body.title.toString().slice(0, 120);
  try {
    const result = await guardedCall<unknown>("write_note", args);
    noteWritten();
    return Response.json({ ok: true, result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ ok: false, error: msg }, { status: /rate|minute|429/i.test(msg) ? 429 : 502 });
  }
}
