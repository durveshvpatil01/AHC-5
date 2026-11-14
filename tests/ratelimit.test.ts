import { describe, expect, it } from "vitest";
import { _resetRateLimit, clientIp, limit } from "../src/lib/ratelimit";

describe("rate limit", () => {
  it("allows 12 copilot questions per 10 min, refuses the 13th", () => {
    _resetRateLimit();
    for (let i = 0; i < 12; i++) expect(limit("copilot:1.2.3.4", 12, 600_000).ok).toBe(true);
    const r = limit("copilot:1.2.3.4", 12, 600_000);
    expect(r.ok).toBe(false);
    expect(r.retryAfterSec).toBeGreaterThan(0);
    expect(limit("copilot:5.6.7.8", 12, 600_000).ok).toBe(true);
  });
  it("reads the client ip from proxy headers", () => {
    expect(clientIp(new Request("http://x", { headers: { "x-forwarded-for": "9.9.9.9, 10.0.0.1" } }))).toBe("9.9.9.9");
    expect(clientIp(new Request("http://x", { headers: { "x-real-ip": "8.8.8.8" } }))).toBe("8.8.8.8");
    expect(clientIp(new Request("http://x"))).toBe("local");
  });
});
