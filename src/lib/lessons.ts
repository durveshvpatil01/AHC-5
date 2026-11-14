// Lessons and playbook: what went wrong (or right) on these accounts, the evidence, and the rule we follow
// next time. Each lesson only appears when its evidence is in the data. Guards turn lessons into warnings on
// moves and plan steps. The playbook is the reusable checklist for the next account (e.g. 7 new police counties).
import { recCsv, recData, type RawAccount, type RawPack } from "./model";
import type { AccountView, CrmView } from "./types";

export interface Lesson {
  id: string;
  account: string; // "A" | "B" | "all"
  kind: "mistake" | "worked";
  title: string;
  whatHappened: string;
  why: string;
  rule: string;
  source: "handover history" | "morning" | "live event" | "your note";
  cite: string[];
}

export interface Guard { lessonId: string; appliesTo: string; warning: string }

export function lessonsFor(a: RawAccount, pack: RawPack, view: Omit<AccountView, "plan" | "lessons">, notes: CrmView["notes"]): { lessons: Lesson[]; guards: Guard[] } {
  const A = a.id;
  const r = (p: string) => `${A}:${p}`;
  const L: Lesson[] = [];
  const prof = recData<{ contacts_on_file: { note: string }[]; not_on_file: string[] }>(pack, "profile.json");
  const calls = recData<{ calls: { date: string; actions?: string[]; path?: string; summary: string }[] }>(pack, "calls_index.json")?.calls ?? [];
  const reqs = recCsv(pack, "requests.csv");
  const notesInt = recData<{ notes: { date: string; text: string }[] }>(pack, "internal_notes.json")?.notes ?? [];

  // Single-threaded
  const alone = prof?.contacts_on_file.find((c) => /alone/i.test(c.note));
  if (alone) L.push({ id: `${A}-L-THREAD`, account: A, kind: "mistake", title: "We let one person be the only door", whatHappened: alone.note, why: "Every call went through one contact who asked to keep it that way, so FlytBase never met users, payers or deciders.", rule: "Within 2 weeks of a handover, meet at least one user, one payer and one decider for every sub-unit (force / plant).", source: "handover history", cite: [r("profile.json")] });

  // Unanswered customer requests
  const unanswered = reqs.filter((q) => q.status !== "Closed" && !q.owner);
  if (unanswered.length) L.push({ id: `${A}-L-NOREPLY`, account: A, kind: "mistake", title: `${unanswered.length} customer request${unanswered.length > 1 ? "s" : ""} left without an owner`, whatHappened: unanswered.map((q) => `${q.request_id !== "(none)" ? q.request_id + ": " : ""}${q.summary.split(".")[0]} (${q.from}, ${q.opened})`).join("; "), why: "Requests arrived outside a ticket queue or with no assignee, and nobody owned them.", rule: "Every customer ask gets a named owner the same day and a reply within 2 business days, especially from an ally or a payer.", source: "handover history", cite: unanswered.map((q) => (q.request_id !== "(none)" && q.request_id ? q.request_id : r("requests.csv"))) });

  // Actions with no owner / never done
  const loose = calls.flatMap((c) => (c.actions ?? []).filter((x) => /owner: none|no further note|not received|not sent|not done|no outcome|no reply/i.test(x)).map((x) => ({ c, x })));
  if (loose.length) L.push({ id: `${A}-L-LOOSE`, account: A, kind: "mistake", title: `${loose.length} call actions were never closed`, whatHappened: loose.slice(0, 4).map(({ c, x }) => `${c.date}: ${x}`).join(" · "), why: "Actions were noted on calls but had no owner or date, so they quietly died.", rule: "Every call action is a task with an owner and a date in the CRM (Action queue), reviewed weekly.", source: "handover history", cite: [...new Set(loose.slice(0, 4).map(({ c }) => (c.path ? r(c.path) : r("calls_index.json"))))] });

  // Missing dock-to-site map
  if (prof?.not_on_file.some((t) => /which dock/i.test(t))) L.push({ id: `${A}-L-MAP`, account: A, kind: "mistake", title: "No dock-to-site map after installation", whatHappened: prof.not_on_file.find((t) => /which dock/i.test(t))!, why: "The install list stayed with the field team or the customer, so usage can't be shown per force or plant.", rule: "The dock-to-site map is a handover gate: no handover to customer success without it.", source: "handover history", cite: [r("profile.json"), r("internal_notes.json")] });

  // Claims taken on trust
  const claims = a.facts.filter((f) => f.status === "claim");
  if (claims.length) L.push({ id: `${A}-L-TRUST`, account: A, kind: "mistake", title: "The official story was taken on trust", whatHappened: claims.map((c) => `“${c.text}” (${c.said_by})`).join(" · "), why: "The champion's numbers were repeated internally without workings, and the usage data said otherwise.", rule: "A number stays out of the book until a file backs it. Check every claim against usage before repeating it.", source: "morning", cite: claims.map((c) => c.id) });

  // Expansion pitched too early (morning)
  const declined = a.offers.filter((o) => o.status === "declined");
  const idleShare = view.kpis.docks ? 1 - view.kpis.active / view.kpis.docks : 0;
  if (declined.length) L.push({ id: `${A}-L-EXPAND`, account: A, kind: "mistake", title: "Pitched more before the customer had value", whatHappened: declined.map((o) => `“${o.title}” to ${o.pitch_to}: declined`).join(" · ") + `. At the time ${Math.round(idleShare * 100)}% of docks were not flying weekly.`, why: "You can't sell more docks (or more support) to someone whose current docks aren't proving their worth, or before their blocker is fixed.", rule: "No expansion pitch while more than half the fleet is idle, or while a blocker (document, sign-off, staffing) is open. Fix, prove, then expand.", source: "morning", cite: declined.map((o) => o.id) });

  // What worked (morning)
  const won = a.offers.filter((o) => o.status === "won");
  if (won.length) L.push({ id: `${A}-L-WORKED`, account: A, kind: "worked", title: "Offers that fixed a stated pain were accepted", whatHappened: won.map((o) => `“${o.title}” to ${o.pitch_to}: won`).join(" · "), why: "They answered what the user had just told us (operator shortage, cover on the day), after we had asked about their operation first.", rule: "Ask about the operation first; offer only what fixes a pain the person has named.", source: "morning", cite: [...won.map((o) => o.id), ...a.facts.filter((f) => /staff|overtime|operator/i.test(f.text)).map((f) => f.id)] });

  // Usage reporting stopped
  if (calls.some((c) => (c.actions ?? []).some((x) => /usage summar/i.test(x) && /not sent/i.test(x)))) L.push({ id: `${A}-L-REPORT`, account: A, kind: "mistake", title: "The monthly usage report stopped", whatHappened: "Usage summaries were sent for May and June, then stopped.", why: "Without a monthly view, idle docks went unnoticed until the renewal.", rule: "Send usage by sub-unit every month, automatically, to a user and a payer.", source: "handover history", cite: calls.filter((c) => (c.actions ?? []).some((x) => /usage summar/i.test(x))).slice(0, 2).map((c) => (c.path ? r(c.path) : r("calls_index.json"))) });

  // Internal tickets with nobody owning them
  const orphan = notesInt.filter((n) => /no account owner|still no owner|who picks this up/i.test(n.text));
  if (orphan.length) L.push({ id: `${A}-L-ORPHAN`, account: A, kind: "mistake", title: "Support tickets had no account owner", whatHappened: orphan.map((n) => `${n.date}: ${n.text}`).join(" · "), why: "Support didn't know who owned the account, so tickets waited.", rule: "Every ticket on a strategic account is auto-assigned to the CSM.", source: "handover history", cite: [r("internal_notes.json")] });

  // The champion is not the user (logins, users.json)
  const users = recData<{ users: { user_id: string; name: string | null; role: string; sign_ins_last_90_days: number | null }[] }>(pack, "users.json")?.users ?? [];
  const metIdle = users.filter((u) => u.name && (u.sign_ins_last_90_days ?? 0) === 0).map((u) => ({ u, p: a.stakeholders.find((s) => s.name === u.name) })).filter((x) => x.p);
  const realOperator = users.filter((u) => /administrator|operator/i.test(u.role) && !u.name).sort((x, y) => (y.sign_ins_last_90_days ?? 0) - (x.sign_ins_last_90_days ?? 0))[0];
  if (A === "B" && metIdle.length && realOperator && (realOperator.sign_ins_last_90_days ?? 0) > 0) L.push({ id: `${A}-L-USER`, account: A, kind: "mistake", title: "The champion is not the user", whatHappened: `${metIdle.map((x) => `${x.u.name}: ${x.u.sign_ins_last_90_days ?? 0} sign-ins in 90 days`).join(" · ")}, while ${realOperator.role} (${realOperator.user_id}) has ${realOperator.sign_ins_last_90_days}.`, why: "We worked through the sponsor, but the programme is run day to day by someone we never met.", rule: "Find and win the real operator (deputy, unit inspector) as well as the sponsor.", source: "handover history", cite: [r("users.json"), ...metIdle.map((x) => x.p!.id)] });

  // Your own notes titled lesson:...
  notes.filter((n) => (!n.account || n.account === A) && /^lesson:/i.test(n.title ?? "")).forEach((n, i) => L.push({ id: `${A}-L-NOTE-${i}`, account: A, kind: "mistake", title: (n.title ?? "").replace(/^lesson:\s*/i, ""), whatHappened: n.text, why: "Recorded by the CSM.", rule: n.text, source: "your note", cite: [] }));

  // Guards: lessons applied to what we are about to do.
  const guards: Guard[] = [];
  const expand = L.find((l) => l.id === `${A}-L-EXPAND`);
  const anyBlocker = view.deals.some((d) => d.kind !== "offer" && d.blocker);
  if (expand || idleShare > 0.4) {
    view.moves.filter((m) => /stadium|tender|scale|re-offer|expan|sister|plant 15/i.test(m.title + m.detail)).forEach((m) => guards.push({ lessonId: expand?.id ?? `${A}-L-EXPAND`, appliesTo: m.id, warning: `Don't pitch yet: ${Math.round(idleShare * 100)}% of docks are not flying weekly${anyBlocker ? " and blockers are open" : ""}. Fix, prove, then expand.` }));
  }
  return { lessons: L, guards };
}

/** The reusable playbook for the next account, distilled from the lessons above. */
export const PLAYBOOK: { phase: string; steps: { do: string; because: string }[] }[] = [
  { phase: "Week 1: handover", steps: [
    { do: "Get the dock-to-site map and the invoice split before accepting the handover.", because: "Without them, usage can't be shown per force or plant, and the payer is unknown (L-MAP)." },
    { do: "List every open customer request and give each an owner the same day.", because: "Unanswered asks from the ally and the payer were the first red risks (L-NOREPLY)." },
    { do: "Read the usage data before the first call; mark every number in the official story as a claim.", because: "Both official stories were contradicted by usage (L-TRUST)." },
    { do: "Ask each sub-unit for its document / sign-off requirements (data protection, security).", because: "Tarn Valley's docks waited months for documentation (FB-10412)." },
  ] },
  { phase: "Weeks 2-3: map the power", steps: [
    { do: "Meet one user, one payer and one decider per sub-unit (force / plant). Ask the ally for introductions.", because: "One-door accounts break when the champion leaves (L-THREAD)." },
    { do: "Ask each idle sub-unit what blocks it (documents, sign-off, staffing, network) before anything else.", because: "Tarn Valley's docks waited on documentation; Aldermoor's plants on owners and networks." },
    { do: "Restart a monthly usage report per sub-unit, to a user and a payer.", because: "Idle docks hid for months when the report stopped (L-REPORT)." },
    { do: "Check operator logins at 30 days; re-train anyone under 5 sign-ins.", because: "Trained operators at idle sites never used the product (users.json)." },
  ] },
  { phase: "Month 1-3: fix, prove", steps: [
    { do: "Clear each sub-unit's blocker, then get first live missions.", because: "Value comes from flying, not from installed docks." },
    { do: "Document value in the customer's own numbers (missions, response times, cost per flight).", because: "This becomes the proof case for renewal and expansion." },
    { do: "Offer only what fixes a pain the person has named.", because: "Those offers were accepted; early pitches were declined (L-WORKED, L-EXPAND)." },
    { do: "Set a default patrol schedule at every site, not only where asked.", because: "Aldermoor scheduled patrols only at the plants that asked (FR-002)." },
  ] },
  { phase: "Month 3-12: expand", steps: [
    { do: "Pitch expansion only when more than half the fleet flies weekly and no blocker is open.", because: "Pitching more to a customer with idle docks loses trust (L-EXPAND)." },
    { do: "Reuse a proven play across sub-units (e.g. the stadium/events template), one sub-unit at a time.", because: "A win at one force or plant is the best evidence for the next." },
    { do: "Renew on real usage per sub-unit, 90 days before term end.", because: "Payers now ask for cost per plant or per force." },
  ] },
];
