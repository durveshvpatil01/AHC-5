// "Sync now": ask the MCP for live events right away (still respecting one call a minute).
import { syncStatus, tick, secondsUntilNextCall } from "@/lib/sync";
import { clientIp, limit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rl = limit(`sync:${clientIp(req)}`, 6, 10 * 60_000);
  if (!rl.ok) return Response.json({ ok: false, waitSec: rl.retryAfterSec, error: `Too many sync requests. Try again in ${rl.retryAfterSec}s.`, sync: syncStatus() }, { status: 429 });
  const key = new URL(req.url).searchParams.get("source") ?? "signals";
  const wait = secondsUntilNextCall();
  if (wait > 0) return Response.json({ ok: false, waitSec: wait, error: `The token allows one MCP call a minute. Next call in ${wait}s.`, sync: syncStatus() }, { status: 429 });
  const r = await tick(key);
  return Response.json({ ok: true, ...r, sync: syncStatus() });
}
