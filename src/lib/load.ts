import "server-only";
import { buildCrm, type RawFeatureRequest } from "./engine";
import type { RawExport, RawPack, RawSignal } from "./model";
import { getSource, sources, syncStatus, tick } from "./sync";
import { readSnapshot } from "./aq";
import type { CrmView } from "./types";

let memo: { version: number; crm: CrmView } | null = null;

/** Build the CRM from whatever the portal's MCP connection holds right now. Rebuilt only when data changed. */
export async function getCrm(opts: { tick?: boolean } = { tick: true }): Promise<{ crm: CrmView; version: number }> {
  if (opts.tick) await tick();
  const status = syncStatus();
  if (memo && memo.version === status.version) return memo;

  const exp = getSource<RawExport>("accounts", "export.json");
  const sig = getSource<{ signals: RawSignal[] }>("signals", "signals.json");
  const notes = getSource<{ notes: (CrmView["notes"][number] & { created_at?: string })[] }>("notes", "notes.json");
  const packs: RawPack[] = sources()
    .filter((s) => s.key.startsWith("pack_"))
    .map((s) => getSource<RawPack>(s.key, s.snapshot).data)
    .filter((p): p is RawPack => !!p?.records);
  const files: Record<string, unknown> = {};
  for (const s of sources().filter((x) => x.key.startsWith("file_"))) {
    const got = getSource<unknown>(s.key, s.snapshot);
    if (got.data != null) files[String(s.args.id ?? s.args.file_id)] = got.data;
  }
  const team = (readSnapshot<{ people: CrmView["team"] }>("team.json")?.people ?? []).map((p) => ({ id: p.id, name: p.name, role: p.role }));
  const signals = sig.data?.signals ?? [];
  // Mid-build drops: accounts that arrive through get_new_account are merged into the export.
  const baseExp: RawExport = exp.data ? { ...exp.data, accounts: [...exp.data.accounts], files: [...(exp.data.files ?? [])] } : ({ exported_at: "", accounts: [], files: [] } as unknown as RawExport);
  for (const s of sources().filter((x) => x.key.startsWith("new_"))) {
    const got = getSource<RawExport>(s.key, s.snapshot).data;
    for (const acc of got?.accounts ?? []) if (!baseExp.accounts.some((a) => a.id === acc.id)) baseExp.accounts.push(acc);
    for (const f of got?.files ?? []) if (!baseExp.files.some((x) => x.id === f.id)) baseExp.files.push(f);
  }
  // Newer accounts send blocker as {text, status} and deadlines in game minutes: normalise to one shape.
  for (const acc of baseExp.accounts) {
    for (const o of acc.opportunities) {
      const b = o.blocker as unknown;
      if (b && typeof b === "object") {
        const bo = b as { text?: string; status?: string };
        o.blocker = bo.status && bo.status !== "open" ? `${bo.text ?? ""} (${bo.status})` : (bo.text ?? null);
      }
    }
  }
  const featureRequests = getSource<{ requests?: RawFeatureRequest[] }>("feature_requests", "feature_requests.json").data;

  const crm = buildCrm({
    exp: baseExp,
    packs,
    signals,
    notes: (notes.data?.notes ?? []).map((n) => ({ id: String(n.id), account: n.account, kind: n.kind, title: n.title, text: n.text, at: n.created_at ? n.created_at.slice(0, 16).replace("T", " ") : n.at })),
    team,
    files,
    featureRequests,
    sync: {
      export: { source: exp.source, at: exp.fetchedAt ?? "" },
      signals: { source: sig.source, at: sig.fetchedAt ?? "", count: signals.length },
      notes: { source: notes.source, at: notes.fetchedAt ?? "", count: notes.data?.notes?.length ?? 0 },
    },
  });
  memo = { version: status.version, crm };
  return memo;
}
