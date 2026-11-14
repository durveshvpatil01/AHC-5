// Write a note / task / risk / next_step back to the game through the MCP (server side only).
import { revalidateTag } from "next/cache";
import { writeNote } from "@/lib/aq";

export const dynamic = "force-dynamic";

const KINDS = new Set(["note", "task", "risk", "next_step"]);

export async function POST(req: Request) {
  let body: { account?: string; kind?: string; title?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Bad JSON" }, { status: 400 });
  }
  const text = (body.text ?? "").toString().slice(0, 2000).trim();
  if (!text) return Response.json({ ok: false, error: "Text is required" }, { status: 400 });
  const account = body.account === "A" || body.account === "B" ? body.account : undefined;
  const kind = KINDS.has(body.kind ?? "") ? body.kind : "note";
  try {
    const result = await writeNote({ account, kind, title: body.title?.toString().slice(0, 120), text });
    revalidateTag("aq-notes");
    return Response.json({ ok: true, result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const limited = /429|rate|minute/i.test(msg);
    return Response.json({ ok: false, error: limited ? "Rate limited (1 call a minute per token). Try again in a minute." : msg }, { status: limited ? 429 : 502 });
  }
}
