// Lightweight poll target for the browser: returns a fingerprint of the live data.
// The page re-renders (router.refresh) when the fingerprint changes. No token reaches the client.
import { getExport, getNotes, getSignals } from "@/lib/aq";

export const dynamic = "force-dynamic";

export async function GET() {
  const [sig, exp, notes] = await Promise.all([
    getSignals<{ signals: { id: string; dated: string; title: string; account: string }[] }>(),
    getExport<{ exported_at: string }>(),
    getNotes<{ notes: unknown[] }>(),
  ]);
  const signals = sig.data?.signals ?? [];
  return Response.json({
    fingerprint: [signals.map((s) => s.id).join(","), exp.data?.exported_at, notes.data?.notes?.length ?? 0].join("|"),
    signals: signals.map((s) => ({ id: s.id, dated: s.dated, title: s.title, account: s.account })),
    sync: { signals: { source: sig.source, at: sig.fetchedAt }, export: { source: exp.source, at: exp.fetchedAt }, notes: { source: notes.source, at: notes.fetchedAt } },
  });
}
