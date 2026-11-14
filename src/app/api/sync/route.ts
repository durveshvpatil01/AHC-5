// "Sync now": ask the MCP for live events right away (still respecting one call a minute).
import { syncStatus, tick, secondsUntilNextCall } from "@/lib/sync";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const key = new URL(req.url).searchParams.get("source") ?? "signals";
  const wait = secondsUntilNextCall();
  if (wait > 0) return Response.json({ ok: false, waitSec: wait, error: `The token allows one MCP call a minute. Next call in ${wait}s.`, sync: syncStatus() }, { status: 429 });
  const r = await tick(key);
  return Response.json({ ok: true, ...r, sync: syncStatus() });
}
