// In-memory sliding-window rate limiter for the public API routes (per server instance).
// Protects the Anthropic credit (/api/copilot) and the game's notes (/api/notes) from abuse.

const hits = new Map<string, number[]>();
const MAX_KEYS = 5000;

/** Client IP from the proxy headers: first x-forwarded-for value, else x-real-ip, else "local". */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "local";
}

/** Allow at most `max` calls per `windowMs` for `key`. Records the call when allowed. */
export function limit(key: string, max: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const cutoff = now - windowMs;
  // Keep the map small: drop keys whose newest hit is older than the window.
  if (hits.size > MAX_KEYS) {
    for (const [k, v] of hits) if (!v.length || v[v.length - 1] <= cutoff) hits.delete(k);
  }
  const list = (hits.get(key) ?? []).filter((t) => t > cutoff);
  if (list.length >= max) {
    hits.set(key, list);
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((list[0] + windowMs - now) / 1000)) };
  }
  list.push(now);
  hits.set(key, list);
  return { ok: true, retryAfterSec: 0 };
}

/** Test helper. */
export function _resetRateLimit() {
  hits.clear();
}
