// Turns raw MCP data (export + paperwork packs + live signals) into clean, cited building blocks.
// Pure functions: no fetching here.
import { parseCsv } from "./csv";
import type { DockStat, Person, Signal, Source, Stance, TimelineItem } from "./types";

/* ---------- raw shapes (subset of get_data_format we rely on) ---------- */
export interface RawFact { id: string; text: string; said_by: string; status: "claim" | "told" | "verified"; verified_by?: string; learned_at_minute?: number }
export interface RawStakeholder { id: string; name: string; role: string; relationship: Stance; available?: boolean }
export interface RawOpp { id: string; title: string; stage: string; worth_up_to: number | null; size: number | null; blocker: string | null; evidence: string[]; deadline: { text: string; soon?: boolean; passed?: boolean; met?: boolean; moves_left?: number | null } | null }
export interface RawOffer { id: string; title: string; value: number; pitch_to: string; status: string }
export interface RawAccount { id: string; name: string; official_story: string; stakeholders: RawStakeholder[]; facts: RawFact[]; opportunities: RawOpp[]; offers: RawOffer[]; deadlines: { text: string; passed: boolean }[] }
export interface RawExport { exported_at: string; accounts: RawAccount[]; files: { id: string; title: string; path: string; account: string }[] }
export interface RawRecord { path: string; kind: string; text?: string; data?: unknown; fromSignal?: string }
export interface RawPack { account: string; records: RawRecord[] }
export interface RawSignal { id: string; account: string; dated: string; title: string; summary: string; records: { kind: string; path: string; text: string; note?: string }[] }

/* ---------- helpers ---------- */
export const DAY = 86_400_000;
export const isoDay = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (iso: string, n: number) => isoDay(new Date(new Date(iso + "T00:00:00Z").getTime() + n * DAY));
export const daysBetween = (a: string, b: string) => Math.round((new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) / DAY);

export function rec(pack: RawPack, path: string): RawRecord | undefined {
  return pack.records.find((r) => r.path === path);
}
export function recData<T>(pack: RawPack, path: string): T | null {
  return (rec(pack, path)?.data as T) ?? null;
}
export function recCsv(pack: RawPack, path: string): Record<string, string>[] {
  const r = rec(pack, path);
  return r?.text ? parseCsv(r.text) : [];
}

/** Merge live signal records into the paperwork pack: CSV rows are appended (deduped), new files are added. */
export function mergeSignals(pack: RawPack, signals: RawSignal[]): RawPack {
  const records = pack.records.map((r) => ({ ...r }));
  for (const s of signals.filter((x) => x.account === pack.account)) {
    for (const r of s.records) {
      const path = r.path.replace(/^[A-Z]\//, "");
      const existing = records.find((x) => x.path === path);
      if (existing && existing.text && path.endsWith(".csv")) {
        const have = new Set(existing.text.trim().split(/\r?\n/));
        const add = r.text.trim().split(/\r?\n/).slice(1).filter((l) => l && !have.has(l));
        if (add.length) existing.text = existing.text.trimEnd() + "\n" + add.join("\n") + "\n";
      } else if (!existing) {
        records.push({ path, kind: r.kind, text: r.text, fromSignal: s.id });
      }
    }
  }
  return { ...pack, records };
}

/* ---------- fleet analytics ---------- */
export function fleetStats(pack: RawPack): { docks: DockStat[]; weeks: string[] } {
  const usage = recCsv(pack, "usage_weekly.csv");
  const flights = recCsv(pack, "flights.csv");
  const events = recCsv(pack, "device_events.csv");
  const weeks = [...new Set(usage.map((u) => u.week_start))].sort();
  const last4 = new Set(weeks.slice(-4));
  const prev4 = new Set(weeks.slice(-8, -4));
  const last12 = weeks.slice(-12);
  const devices = recData<{ docks: { dock_id: string }[] }>(pack, "devices.json")?.docks ?? [];
  const ids = [...new Set([...devices.map((d) => d.dock_id), ...usage.map((u) => u.dock_id)])].sort();
  const recentEventsFrom = weeks.slice(-8)[0] ?? "0000";

  const docks: DockStat[] = ids.map((id) => {
    const u = usage.filter((r) => r.dock_id === id);
    const sum = (set: Set<string>) => u.filter((r) => set.has(r.week_start)).reduce((a, r) => a + Number(r.flights || 0), 0);
    const total = u.reduce((a, r) => a + Number(r.flights || 0), 0);
    const daysOnline4 = u.filter((r) => last4.has(r.week_start)).reduce((a, r) => a + Number(r.days_online || 0), 0);
    const ev = events.filter((e) => e.dock_id === id && e.date >= recentEventsFrom);
    const connLost = ev.filter((e) => e.event === "connection_lost" || e.event === "offline").length;
    const battery = events.filter((e) => e.dock_id === id && e.event === "battery_health_warning").length;
    const fl = flights.filter((f) => f.dock_id === id).map((f) => f.date).sort();
    const usageLastFlightWeek = [...u].filter((r) => Number(r.flights) > 0).map((r) => r.week_start).sort().pop() ?? null;
    const lastFlight = [fl[fl.length - 1] ?? null, usageLastFlightWeek].filter(Boolean).sort().pop() ?? null;
    const l4 = sum(last4);
    const p4 = sum(prev4);
    const status: DockStat["status"] = total === 0 ? "never" : l4 === 0 ? "dormant" : l4 < 4 ? "low" : "active";
    const flags: string[] = [];
    if (connLost >= 10) flags.push(`${connLost} connection drops in 8 wks`);
    if (battery >= 5) flags.push(`${battery} battery warnings`);
    const w2 = weeks.slice(-2), w4before = weeks.slice(-6, -2);
    const last2 = u.filter((r) => w2.includes(r.week_start)).reduce((a, r) => a + Number(r.flights || 0), 0);
    const before4 = u.filter((r) => w4before.includes(r.week_start)).reduce((a, r) => a + Number(r.flights || 0), 0);
    if (before4 >= 12 && last2 === 0) flags.push(`stopped: 0 flights in 2 wks (was ${Math.round(before4 / 4)}/wk)`);
    else if (p4 >= 8 && l4 <= p4 * 0.25) flags.push(`fell from ${p4} to ${l4} flights`);
    if (daysOnline4 > 0 && daysOnline4 < 21) flags.push(`online ${daysOnline4}/28 days`);
    const trend = last12.map((w) => u.filter((r) => r.week_start === w).reduce((a, r) => a + Number(r.flights || 0), 0));
    return { dockId: id, total, last4: l4, prev4: p4, daysOnline4, connLost, battery, lastFlight, status, flags, trend };
  });
  return { docks, weeks };
}

/* ---------- people ---------- */
interface Profile {
  currency: string;
  sector: string;
  what_they_bought: string;
  flytbase_side: { commercial_owner: string };
  contacts_on_file: { id: string; name: string; role: string; last_contact_before_handover: string; note: string }[];
  not_on_file: string[];
  renewal: { term_ends: string; annual_value: number };
}
export const EMPTY_PROFILE: Profile = {
  currency: "USD",
  sector: "Account (new)",
  what_they_bought: "",
  flytbase_side: { commercial_owner: "" },
  contacts_on_file: [],
  not_on_file: ["A contract on file: renewal date, value and who signed it.", "Usage data for this account's docks."],
  renewal: { term_ends: "", annual_value: 0 },
};
export const profileOf = (pack: RawPack): Profile => recData<Profile>(pack, "profile.json") ?? EMPTY_PROFILE;
export const hasProfile = (pack: RawPack) => !!recData(pack, "profile.json");

export function peopleOf(acc: RawAccount, pack: RawPack): Person[] {
  const prof = profileOf(pack);
  const users = recData<{ users: { user_id: string; name: string | null; role: string; last_sign_in: string | null; sign_ins_last_90_days: number }[] }>(pack, "users.json")?.users ?? [];
  const met: Person[] = acc.stakeholders.map((s) => {
    const onFile = prof.contacts_on_file.find((c) => c.id === s.id);
    const u = users.find((x) => x.name === s.name);
    return {
      id: s.id,
      name: s.name,
      role: s.role,
      stance: s.relationship,
      met: true,
      lastContact: onFile?.last_contact_before_handover ?? null,
      signIns90: u?.sign_ins_last_90_days ?? null,
      note: onFile?.note ?? "Met this morning; not in the handover file.",
      cite: [s.id, ...(onFile ? ["profile.json"] : []), ...(u ? ["users.json"] : [])],
    };
  });
  const onFileNotMet: Person[] = prof.contacts_on_file
    .filter((c) => !acc.stakeholders.some((s) => s.id === c.id))
    .map((c) => ({ id: c.id, name: c.name, role: c.role, stance: "unknown", met: false, lastContact: c.last_contact_before_handover, signIns90: null, note: c.note, cite: ["profile.json"] }));
  return [...met, ...onFileNotMet];
}

/* ---------- timeline ---------- */
export function timelineOf(pack: RawPack, signals: RawSignal[]): TimelineItem[] {
  const out: TimelineItem[] = [];
  const calls = recData<{ calls: { date: string; title: string; customer: string[]; summary: string; path?: string }[] }>(pack, "calls_index.json")?.calls ?? [];
  calls.forEach((c) => out.push({ date: c.date, kind: "call", title: `${c.title}: ${c.summary}`, who: c.customer.join(", "), cite: c.path ?? "calls_index.json" }));
  const mail = recData<{ mail: { thread: string; kind: string; date: string; from: string; to: string; subject: string }[] }>(pack, "mail_log.json")?.mail ?? [];
  mail.filter((m) => m.kind === "person").forEach((m) => out.push({ date: m.date, kind: "email", title: m.subject, who: `${m.from} → ${m.to}`, cite: "mail_log.json" }));
  const tickets = recData<{ tickets: { id: string; opened: string; requester: string; subject: string; status: string }[] }>(pack, "tickets.json")?.tickets ?? [];
  tickets.forEach((t) => out.push({ date: t.opened, kind: "ticket", title: `${t.id} · ${t.subject} (${t.status})`, who: t.requester, cite: t.id }));
  const notes = recData<{ notes: { date: string; from: string; text: string }[] }>(pack, "internal_notes.json")?.notes ?? [];
  notes.forEach((n) => out.push({ date: n.date, kind: "internal", title: n.text, who: n.from, cite: "internal_notes.json" }));
  signals.filter((s) => s.account === pack.account).forEach((s) => out.push({ date: s.dated, kind: "signal", title: s.title.replace(/^[^:]+:\s*/, ""), who: "Live event", cite: s.id, isNew: true }));
  return out.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/* ---------- sources registry ---------- */
export function buildSources(exp: RawExport, packs: RawPack[], signals: RawSignal[], fleet: Record<string, DockStat[]>): Record<string, Source> {
  const S: Record<string, Source> = {};
  const add = (s: Source) => (S[s.id] = s);
  for (const a of exp.accounts) {
    a.facts.forEach((f) => add({ id: f.id, kind: "fact", title: `${f.said_by} · ${f.status}${f.verified_by ? ` (verified by ${f.verified_by})` : ""}`, text: f.text, meta: `Account ${a.id} · learned at minute ${f.learned_at_minute ?? "?"}` }));
    a.stakeholders.forEach((p) => add({ id: p.id, kind: "person", title: `${p.name} · ${p.role}`, text: `Relationship this morning: ${p.relationship}.`, meta: `Account ${a.id}` }));
    a.opportunities.forEach((o) => add({ id: o.id, kind: "deal", title: o.title, text: `Stage: ${o.stage}. Worth up to: ${o.worth_up_to ?? "not shown (not qualified)"}. Evidence: ${o.evidence.join(", ") || "none"}.${o.deadline ? ` Deadline: ${o.deadline.text}` : ""}`, meta: `Account ${a.id} · export` }));
    a.offers.forEach((o) => add({ id: o.id, kind: "offer", title: o.title, text: `Value ${o.value.toLocaleString()} · pitched to ${o.pitch_to} · ${o.status}.`, meta: `Account ${a.id} · export` }));
  }
  exp.files.forEach((f) => {
    const pack = packs.find((p) => p.account === f.account);
    add({ id: f.id, kind: "file", title: f.title, text: `Data room file ${f.path}. Held by you since this morning.`, meta: `Account ${f.account}` });
    void pack;
  });
  for (const p of packs) {
    for (const r of p.records) {
      const text = r.text ?? JSON.stringify(r.data, null, 1);
      const id = r.path;
      // Account-qualified id for shared names; plain path is what get_paperwork_record takes.
      add({ id: `${p.account}:${id}`, kind: "record", title: `${p.account}/${id}`, text: text.length > 6000 ? text.slice(0, 6000) + "\n…(truncated)" : text, meta: r.fromSignal ? `Arrived with live event ${r.fromSignal}` : `get_paperwork_record(${p.account}, ${id})` });
    }
    const tickets = recData<{ tickets: { id: string; opened: string; requester: string; subject: string; status: string; conversation?: { date: string; from: string; text: string }[] }[] }>(p, "tickets.json")?.tickets ?? [];
    tickets.forEach((t) => add({ id: t.id, kind: "ticket", title: `${t.id} · ${t.subject}`, text: `${t.status} · opened ${t.opened} by ${t.requester}\n\n` + (t.conversation ?? []).map((c) => `${c.date} ${c.from}: ${c.text}`).join("\n"), meta: `Account ${p.account} · tickets.json` }));
    const reqs = recCsv(p, "requests.csv");
    reqs.filter((r) => r.request_id && r.request_id !== "(none)" && !S[r.request_id]).forEach((r) => add({ id: r.request_id, kind: "ticket", title: `${r.request_id} · ${r.from}`, text: `${r.summary}\nStatus: ${r.status} · owner: ${r.owner || "none"} · opened ${r.opened}`, meta: `Account ${p.account} · requests.csv` }));
    const inv = recData<{ invoices: { number: string; issued: string; what: string; amount: number | null; status: string; paid?: string }[] }>(p, "invoices.json")?.invoices ?? [];
    inv.forEach((i) => add({ id: i.number, kind: "invoice", title: `${i.number} · ${i.what}`, text: `Issued ${i.issued} · amount ${i.amount ?? "per Schedule 2 (not held)"} · ${i.status}${i.paid ? ` ${i.paid}` : ""}`, meta: `Account ${p.account} · invoices.json` }));
    (fleet[p.account] ?? []).forEach((d) => add({ id: d.dockId, kind: "dock", title: `Dock ${d.dockId}`, text: `Flights: ${d.total} since late April · last 4 weeks ${d.last4} · previous 4 weeks ${d.prev4}\nOnline ${d.daysOnline4}/28 days (last 4 weeks) · connection drops (8 wks) ${d.connLost} · battery warnings ${d.battery}\nLast flight: ${d.lastFlight ?? "never"}\nComputed from usage_weekly.csv, flights.csv and device_events.csv.`, meta: `Account ${p.account} · computed` }));
  }
  signals.forEach((s) => add({ id: s.id, kind: "signal", title: s.title, text: `${s.summary}\n\n` + s.records.map((r) => `--- ${r.path}\n${r.text.length > 1500 ? r.text.slice(0, 1500) + "…" : r.text}`).join("\n"), meta: `Live event · dated ${s.dated} · get_signals` }));
  return S;
}

export function toSignal(s: RawSignal, impact: string[]): Signal {
  return { id: s.id, account: s.account, dated: s.dated, title: s.title, summary: s.summary, records: s.records.map((r) => r.path), impact };
}
