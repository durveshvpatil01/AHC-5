import "server-only";
import { getExport, getNotes, getSignals, readSnapshot } from "./aq";
import { buildCrm } from "./engine";
import type { RawExport, RawPack, RawSignal } from "./model";
import type { CrmView } from "./types";

export async function getCrm(): Promise<CrmView> {
  // Staggered so that a cold start makes at most one live call per source.
  const [exp, sig, notes] = await Promise.all([
    getExport<RawExport>(),
    getSignals<{ signals: RawSignal[] }>(),
    getNotes<{ notes: CrmView["notes"] }>(),
  ]);
  const packs = [readSnapshot<RawPack>("pack_A.json")!, readSnapshot<RawPack>("pack_B.json")!];
  const team = (readSnapshot<{ people: CrmView["team"] }>("team.json")?.people ?? []).map((p) => ({ id: p.id, name: p.name, role: p.role }));
  const signals = sig.data?.signals ?? [];
  return buildCrm({
    exp: exp.data,
    packs,
    signals,
    notes: notes.data?.notes ?? [],
    team,
    sync: {
      export: { source: exp.source, at: exp.fetchedAt },
      signals: { source: sig.source, at: sig.fetchedAt, count: signals.length },
      notes: { source: notes.source, at: notes.fetchedAt, count: notes.data?.notes?.length ?? 0 },
    },
  });
}
