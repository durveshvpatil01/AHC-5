// AI Copilot: streams Claude's answer, grounded on the live CRM (src/lib/copilot.ts).
// Server-side only: the Anthropic key never reaches the browser.
import Anthropic from "@anthropic-ai/sdk";
import { getCrm } from "@/lib/load";
import { COPILOT_MODEL, COPILOT_RULES, buildContext } from "@/lib/copilot";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Turn = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  // Its own variable, so a stale ANTHROPIC_API_KEY in the machine's environment cannot shadow it.
  const apiKey = process.env.COPILOT_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "The Copilot is not configured: set COPILOT_ANTHROPIC_KEY on the server." }, { status: 503 });
  }
  let body: { question?: string; history?: Turn[]; account?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad JSON" }, { status: 400 });
  }
  const question = (body.question ?? "").toString().trim().slice(0, 2000);
  if (!question) return Response.json({ error: "Ask a question." }, { status: 400 });
  const history = (body.history ?? []).filter((t) => (t.role === "user" || t.role === "assistant") && typeof t.content === "string" && t.content.trim()).slice(-8);
  const focus = body.account && /^[A-Z]$/.test(body.account) ? `\n\n(The user is looking at account ${body.account}.)` : "";

  // Uses whatever the portal's MCP connection holds now; no extra MCP call.
  const { crm } = await getCrm({ tick: false });
  const client = new Anthropic({ apiKey });

  const stream = client.beta.messages.stream({
    model: COPILOT_MODEL,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium" },
    system: [
      { type: "text", text: COPILOT_RULES },
      // The CRM context only changes when the data version changes, so it is cached between questions.
      { type: "text", text: buildContext(crm), cache_control: { type: "ephemeral" } },
    ],
    messages: [...history.map((t) => ({ role: t.role, content: t.content })), { role: "user" as const, content: question + focus }],
  });

  const encoder = new TextEncoder();
  const out = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") controller.enqueue(encoder.encode(event.delta.text));
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") controller.enqueue(encoder.encode("\n\n(The model declined to answer this one. Try rephrasing the question.)"));
        if (final.stop_reason === "max_tokens") controller.enqueue(encoder.encode("\n\n(Answer cut short. Ask for the rest.)"));
      } catch (e) {
        const msg =
          e instanceof Anthropic.AuthenticationError ? "The Anthropic API key was rejected."
          : e instanceof Anthropic.RateLimitError ? "The Copilot is rate-limited. Try again in a moment."
          : e instanceof Anthropic.APIError ? `Copilot error ${e.status}: ${e.message}`
          : String(e);
        controller.enqueue(encoder.encode(`\n\n[Copilot unavailable: ${msg}]`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(out, { headers: { "content-type": "text/plain; charset=utf-8", "x-copilot-model": COPILOT_MODEL, "cache-control": "no-store" } });
}
