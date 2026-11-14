// Strategy layer: turns reactive data into a proactive plan.
//  - Story so far: where the account started (Sam's handover), what happened, where it is now.
//  - Unlock chains: deliver X -> unlocks a person / usage / money / expansion. Step status is derived from live data.
//  - Segments: per force / plant group: what we know, what we can give, what we can build.
//  - Plan: chain steps placed on horizons (next 2 weeks / this quarter / 12 months), prerequisites first.
// Lessons and the playbook live in lessons.ts.
import { parseCsv } from "./csv";
import { addDays, daysBetween, recCsv, recData, type RawAccount, type RawPack, type RawSignal } from "./model";
import type { AccountView, Money } from "./types";

export type StepKind = "deliver" | "person" | "usage" | "proof" | "money" | "expansion";
export type StepStatus = "done" | "open" | "blocked" | "at-risk" | "hypothesis";

export interface ChainStep { id: string; kind: StepKind; label: string; detail: string; status: StepStatus; owner: string; due: string | null; value?: Money; cite: string[] }
export interface UnlockChain { id: string; title: string; why: string; steps: ChainStep[]; unlocks: string; value: Money; upside?: string; cite: string[] }
export interface Segment { id: string; name: string; docks: number | null; live: number | null; missions: number | null; training: number | null; state: "flying" | "fading" | "training only" | "not live" | "unknown"; know: string[]; give: string[]; build: string[]; cite: string[] }
export interface StoryPoint { date: string; title: string; detail: string; kind: "handover" | "history" | "morning" | "live" | "now"; cite: string[] }
export interface PlanItem { horizon: "2w" | "quarter" | "12m"; stepId: string; chainId: string; chainTitle: string; title: string; kind: StepKind; owner: string; due: string; status: StepStatus; unlocks: string; cite: string[] }
export interface AccountPlan {
  story: { start: StoryPoint[]; events: StoryPoint[]; now: StoryPoint[] };
  chains: UnlockChain[];
  segments: Segment[];
  plan: PlanItem[];
  headline: string;
}

const money = (amount: number | null, currency: string, basis: Money["basis"], cite: string[], note?: string): Money => ({ amount, currency, basis, cite, note });
const INSURE_CITE = ["B:emails/2026-10-08_finance_mailbox.txt", "B:calls/2025-08-19_enquiry_call.txt"];

/** Parse the flight log file (get_file) into per-force rows; tolerant of shape. */
export function flightLogRows(file: unknown): Record<string, string>[] {
  if (!file) return [];
  const f = file as { text?: string; content?: string; csv?: string; rows?: Record<string, string>[]; data?: unknown };
  if (Array.isArray(f.rows)) return f.rows;
  const text = typeof file === "string" ? file : f.text ?? f.content ?? f.csv ?? (typeof f.data === "string" ? f.data : "");
  return text ? parseCsv(text) : [];
}

/** Normalise the messy force names in the customer's export ("WESTMERE", "Westmere Constabulary", "Tarn Vly"...). */
export function forceOf(name: string): string {
  const n = name.toLowerCase();
  if (n.startsWith("westm")) return "Westmere";
  if (n.startsWith("metro")) return "Metro Central";
  if (n.startsWith("tarn")) return "Tarn Valley";
  if (n.startsWith("norw")) return "Norwold";
  return name;
}

function monthKey(m: string): string {
  // "05/2026", "2026-08", "Jun 2026", "Aug-26", "Sep-26" -> "2026-05"
  const mon = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  let r = m.match(/^(\d{4})-(\d{2})$/);
  if (r) return `${r[1]}-${r[2]}`;
  r = m.match(/^(\d{2})\/(\d{4})$/);
  if (r) return `${r[2]}-${r[1]}`;
  r = m.match(/^([A-Za-z]{3})[- ](\d{2,4})$/);
  if (r) return `${r[2].length === 2 ? "20" + r[2] : r[2]}-${String(mon.indexOf(r[1].toLowerCase()) + 1).padStart(2, "0")}`;
  return m;
}

export function buildPlan(a: RawAccount, pack: RawPack, signals: RawSignal[], view: Omit<AccountView, "plan" | "lessons">, asOf: string, files: Record<string, unknown>): AccountPlan {
  const A = a.id;
  const r = (p: string) => `${A}:${p}`;
  const cur = view.currency;
  const k = view.kpis;
  const perDock = k.renewal.amount && k.docks ? k.renewal.amount / k.docks : 0;
  const sig = (id: string) => signals.find((s) => s.id === id);
  const fact = (id: string) => a.facts.find((f) => f.id === id);
  const reqs = recCsv(pack, "requests.csv");
  const reqOpen = (id: string) => reqs.some((q) => q.request_id === id && q.status !== "Closed");
  const due = (days: number, cap?: string | null) => {
    const d = addDays(asOf, days);
    return cap && d > cap ? cap : d;
  };
  const termCap = k.termEnds ? addDays(k.termEnds, -14) : null;

  /* ---------------- story so far ---------------- */
  const hist = recData<{ history: { date: string; what: string; detail?: string }[]; on_file_as_open_at_handover: { what: string; value: number | null; due?: string; basis: string }[] }>(pack, "deal_history.json");
  const prof = recData<{ flytbase_side: { csm: { who: string; from: string; to?: string }[] }; contacts_on_file: { name: string; note: string }[]; not_on_file: string[] }>(pack, "profile.json");
  const start: StoryPoint[] = [];
  if (prof) {
    const sam = prof.flytbase_side.csm.find((c) => c.who === "sam");
    start.push({ date: sam?.to ?? "2026-11", kind: "handover", title: "Sam hands the account over", detail: `Sam ran it ${sam?.from ?? "?"} to ${sam?.to ?? "?"}. ${prof.contacts_on_file.map((c) => `${c.name}: ${c.note}`).join(" ")}`, cite: [r("profile.json")] });
    (hist?.on_file_as_open_at_handover ?? []).forEach((o) => start.push({ date: o.due ?? "", kind: "handover", title: `Open at handover: ${o.what}`, detail: `${o.value != null ? `${cur === "GBP" ? "£" : "€"}${o.value.toLocaleString("en-GB")} · ` : ""}${o.basis}`, cite: [r("deal_history.json")] }));
    start.push({ date: "", kind: "handover", title: "Not on file at handover", detail: prof.not_on_file.join(" "), cite: [r("profile.json")] });
  }
  const events: StoryPoint[] = [];
  (hist?.history ?? []).forEach((h) => events.push({ date: h.date, kind: "history", title: h.what, detail: h.detail ?? "", cite: [r("deal_history.json")] }));
  const morning = [...a.facts].sort((x, y) => (x.learned_at_minute ?? 0) - (y.learned_at_minute ?? 0));
  if (morning.length) events.push({ date: "morning", kind: "morning", title: `Discovery: ${morning.length} facts from ${a.stakeholders.length} people`, detail: morning.slice(0, 4).map((f) => `“${f.text}” (${f.said_by}, ${f.status})`).join(" · "), cite: morning.slice(0, 6).map((f) => f.id) });
  a.offers.forEach((o) => events.push({ date: "morning", kind: "morning", title: `Offer ${o.status}: ${o.title}`, detail: `Pitched to ${o.pitch_to}, value ${o.value.toLocaleString("en-GB")}.`, cite: [o.id] }));
  signals.forEach((s) => events.push({ date: s.dated, kind: "live", title: s.title.replace(/^[^:]+:\s*/, ""), detail: s.summary, cite: [s.id] }));
  const now: StoryPoint[] = [
    { date: asOf, kind: "now", title: "Where it stands", detail: `${view.dataStory} Health ${k.health.score}/100. Renewal ${k.renewal.amount != null ? `${cur === "GBP" ? "£" : "€"}${k.renewal.amount.toLocaleString("en-GB")}` : "n/a"}${k.daysToRenewal != null ? `, ${k.daysToRenewal} days to term end` : ""}.`, cite: [...view.dataStoryCite, ...k.renewal.cite] },
    { date: asOf, kind: "now", title: `${view.risks.filter((x) => x.level === "red").length} red risks, ${view.gaps.length} unknowns`, detail: view.answers.wrong, cite: view.risks.slice(0, 3).flatMap((x) => x.cite.slice(0, 1)) },
  ];

  /* ---------------- segments ---------------- */
  const segments: Segment[] = [];
  const chains: UnlockChain[] = [];
  if (A === "A") {
    const fileRows = flightLogRows(files["flight_log_force_month"]);
    const byForce = new Map<string, Record<string, string>[]>();
    fileRows.forEach((row) => { const f = forceOf(row.force ?? ""); byForce.set(f, [...(byForce.get(f) ?? []), row]); });
    // Latest complete row per force: the export has re-sent duplicates with blank cells ("re-sent, see above").
    const latest = (f: string) => [...(byForce.get(f) ?? [])].filter((x) => String(x.live_missions ?? x["live missions"] ?? "").trim() !== "").sort((x, y) => monthKey(x.month).localeCompare(monthKey(y.month))).pop();
    const seg = (name: string, know: string[], give: string[], build: string[], cite: string[], fallback: { docks: number; state: Segment["state"] }): Segment => {
      const l = latest(name);
      const col = (row: Record<string, string>, name: string) => Number(row[name] ?? row[name.replace(/_/g, " ")] ?? NaN);
      const docks = l ? col(l, "docks_installed") : fallback.docks;
      const live = l ? col(l, "docks_with_live_flights") : null;
      const missions = l ? col(l, "live_missions") : null;
      const training = l ? col(l, "training_flights") : null;
      const state: Segment["state"] = !l ? fallback.state : live && live >= docks * 0.5 ? "flying" : live && live > 0 ? "fading" : training ? "training only" : "not live";
      return { id: name.toLowerCase().replace(/\s/g, "-"), name, docks, live, missions, training, state, know, give, build, cite: ["flight_log_force_month", ...cite] };
    };
    segments.push(
      seg("Westmere", [
        "Busiest unit; 14 of 18 docks flew last month (verified).",
        "6 part-time operators on overtime; 30 docks need 9 more plus shift cover.",
        "Two missing-person finds in under 12 min vs ~40 for the helicopter (anecdote).",
        "Public event on 5 Dec: wants training dates + named cover in writing.",
        "Batteries on two docks don't last a night shift; email unanswered since Aug.",
      ], ["Operator training before 5 Dec (offer won).", "Priority support / named cover on the day (offer won).", "Battery fix or swap for the two docks."], ["Stadium: 30 docks (Rhys's claim) once staffing is costed.", "Cost-per-flight vs helicopter study as the alliance's proof case."], ["km_usage_1", "km_staff_2", "km_value_2", "urgent_request", "A:emails/2026-08-11_karen_batteries.txt"].filter((x) => x !== "urgent_request" || sig("urgent_request")), { docks: 18, state: "flying" }),
      seg("Metro Central", ["Flies operationally but is fading month on month.", "Raises routine tickets (training flights, map layers, report exports)."], ["Scheduled flight-report export (FR-010) or a manual monthly export as a workaround.", "Refresher on scheduled missions."], ["Win back usage, then a Metro Central events case."], ["rc_appetite_2", "FB-10248", "FB-10781", "FR-010"], { docks: 9, state: "fading" }),
      seg("Tarn Valley", ["Zero live flights since May; 4 docks 'awaiting sign-off'.", "An unanswered force-level document request (FB-10412) has been open since June.", "No named contact."], ["Answer FB-10412: the documentation the sign-off is waiting for (likely data-handling).", "Introduction via Karen (she talks to the other units)."], ["Prove value on its first live missions, then ask about its own stadium/events (the Westmere template)."], ["rc_appetite_2", "FB-10412"], { docks: 4, state: "not live" }),
      seg("Norwold", ["Training flights only, never operational.", "No named contact."], ["Operator training to move from training to live patrols (reuse the Westmere training offer)."], ["First operational use case, then events/stadium like Westmere."], ["rc_appetite_2"], { docks: 4, state: "training only" }),
    );

    /* ---------------- chains (A) ---------------- */
    const docOpen = reqOpen("FB-10412");
    const tarn = segments.find((s) => s.name === "Tarn Valley")!;
    const norw = segments.find((s) => s.name === "Norwold")!;
    chains.push({
      id: "A-C-TARN", title: "Get Tarn Valley flying, then grow it", why: "4 paid-for docks have not flown since May; the force is 'awaiting sign-off' and its document request has gone unanswered.",
      unlocks: "Protects 4 docks of the renewal, wins a second operational force, and opens a stadium/events conversation at Tarn Valley.",
      value: money(4 * perDock, cur, "backed", ["flight_log_force_month", r("contract.txt")], `4 docks × contract price per dock`), upside: "Tarn Valley events/stadium: unknown until they fly.",
      cite: ["FB-10412", "flight_log_force_month"],
      steps: [
        { id: "A-S-TARN-1", kind: "deliver", label: "Deliver the documentation FB-10412 asks for", detail: "Find the requester through the support desk, send the document (contract Schedule 3 data terms / customer-specific documentation is 'supplied on request').", status: docOpen ? "open" : "done", owner: "You (CSM) + Support desk", due: due(3), cite: ["FB-10412", r("contract.txt")] },
        { id: "A-S-TARN-2", kind: "person", label: "Meet Tarn Valley's drone lead", detail: "Ask Karen to introduce her Tarn Valley counterpart; confirm the sign-off is cleared.", status: "open", owner: "You (CSM) via Karen Mbeki", due: due(10), cite: ["rc_appetite_2", "karen_mbeki"] },
        { id: "A-S-TARN-3", kind: "usage", label: "Tarn Valley flies live missions", detail: "First live missions on its 4 docks; operator refresher if needed.", status: (tarn.live ?? 0) > 0 ? "done" : docOpen ? "blocked" : "open", owner: "Pranjal Suyal", due: due(30), cite: ["flight_log_force_month"] },
        { id: "A-S-TARN-4", kind: "proof", label: "Prove value at Tarn Valley", detail: "Missions, response times and cost per flight, in Tarn Valley's own numbers.", status: "open", owner: "You (CSM) + Yashash Rao", due: due(60, termCap), cite: ["km_value_2"] },
        { id: "A-S-TARN-5", kind: "expansion", label: "Ask Tarn Valley about stadiums and events", detail: "Reuse the Westmere stadium template once value is proven. Not before (see lesson L-EXPAND).", status: "hypothesis", owner: "Achal Negi", due: due(150), cite: ["rc_stadium_0"] },
      ],
    });
    chains.push({
      id: "A-C-NORW", title: "Move Norwold from training to live patrols", why: "Norwold flies training only; its docks are part of the renewal.",
      unlocks: "A third operational force and 4 more docks that justify themselves at renewal.",
      value: money(4 * perDock, cur, "backed", ["flight_log_force_month", r("contract.txt")], "4 docks × contract price per dock"), upside: "Events use case like Westmere.",
      cite: ["rc_appetite_2"],
      steps: [
        { id: "A-S-NORW-1", kind: "person", label: "Meet Norwold's drone lead", detail: "Introduction via Karen; learn why they stop at training.", status: "open", owner: "You (CSM) via Karen Mbeki", due: due(10), cite: ["rc_appetite_2"] },
        { id: "A-S-NORW-2", kind: "deliver", label: "Operator training for live missions", detail: "Extend the operator training offer won with Westmere.", status: "open", owner: "Pranjal Suyal", due: due(30), cite: ["a_training"] },
        { id: "A-S-NORW-3", kind: "usage", label: "Norwold flies live missions", detail: "First operational patrols.", status: (norw.live ?? 0) > 0 ? "done" : "blocked", owner: "Pranjal Suyal", due: due(45), cite: ["flight_log_force_month"] },
        { id: "A-S-NORW-4", kind: "expansion", label: "Find Norwold's events/stadium use case", detail: "Only after it flies.", status: "hypothesis", owner: "Achal Negi", due: due(180), cite: [] },
      ],
    });
    chains.push({
      id: "A-C-STADIUM", title: "Westmere stadium: 30 docks, then a template for every force", why: "Rhys says the stadium is a 30-dock opportunity, but it is a claim and Westmere cannot crew more docks today.",
      unlocks: "A costed 30-dock order at Westmere, then the same offer to other forces with stadiums or big events.",
      value: money(30 * perDock, cur, "claim", ["rc_stadium_0", r("contract.txt")], "30 docks × contract price per dock, resting on a claim"), upside: "Every force with a stadium or recurring public events.",
      cite: ["rc_stadium_0", "km_staff_2"],
      steps: [
        { id: "A-S-STAD-1", kind: "deliver", label: "Deliver 5 Dec: trained operators + named cover", detail: "The two won offers, delivered before the event.", status: sig("urgent_request") ? "at-risk" : "open", owner: "You (CSM) + Pranjal Suyal", due: due(1, "2026-12-04"), cite: ["a_training", "a_priority_support", ...(sig("urgent_request") ? ["urgent_request", "FB-11206"] : [])] },
        { id: "A-S-STAD-2", kind: "proof", label: "Document the event: missions, response times", detail: "Turn 5 Dec into Westmere's proof case.", status: "open", owner: "You (CSM)", due: "2026-12-12", cite: ["km_value_2"] },
        { id: "A-S-STAD-3", kind: "deliver", label: "Costed operating model for 30 docks", detail: "9 more operators and shift cover: who flies, at what cost.", status: "open", owner: "Yashash Rao", due: due(30), cite: ["km_staff_2"] },
        { id: "A-S-STAD-4", kind: "person", label: "Meet Westmere command (decider) and payer", detail: "Nobody who decides or pays for Westmere has been met.", status: "open", owner: "You (CSM) via Karen Mbeki", due: due(30), cite: ["a_westmere"] },
        { id: "A-S-STAD-5", kind: "money", label: "Quote and sign the stadium order", detail: "Quote only once the operating model is agreed.", status: fact("rc_stadium_0") ? "hypothesis" : "open", owner: "Achal Negi", due: due(90), value: money(30 * perDock, cur, "claim", ["rc_stadium_0"]), cite: ["rc_stadium_0", r("deal_history.json")] },
        { id: "A-S-STAD-6", kind: "expansion", label: "Offer the stadium template to other forces", detail: "Metro Central, Tarn Valley, Norwold: ask about stadiums and events once each flies.", status: "hypothesis", owner: "Achal Negi", due: due(200), cite: [] },
      ],
    });
    chains.push({
      id: "A-C-RENEW", title: `Renew the 35 docks before ${k.termEnds ?? "term end"}`, why: "No automatic renewal; the only signatory route (Rhys) leaves in January; nobody who pays has been met.",
      unlocks: "The renewal itself, and a multi-threaded account that survives Rhys leaving.",
      value: k.renewal, cite: ["a_renewal", r("contract.txt")],
      steps: [
        { id: "A-S-REN-1", kind: "deliver", label: "Schedule 2 + install sheets from inside FlytBase", detail: "Who pays which quarter; which dock is at which force.", status: "open", owner: "You (CSM) + Achal Negi", due: due(2), cite: [r("invoices.json"), r("internal_notes.json")] },
        { id: "A-S-REN-2", kind: "deliver", label: "Usage by force, monthly", detail: "Restart the usage summary Sam stopped sending in July, now split by force.", status: "open", owner: "You (CSM)", due: due(10), cite: [r("calls/2026-08-19_check_in.txt")] },
        { id: "A-S-REN-2b", kind: "deliver", label: "Board pack: monthly usage-by-force chart (FR-011, asked for by Rhys)", detail: "Rhys asked for a monthly summary chart for boards (FR-011, still 'new' in the product log). Build it by hand from the usage data until the product has it: it gives Hannah and the boards the renewal case.", status: "open", owner: "You (CSM)", due: due(12), cite: ["FR-011", r("calls/2026-06-02_check_in.txt")] },
        { id: "A-S-REN-3", kind: "person", label: "Meet Hannah Doyle (procurement)", detail: "Walk her through usage by force; agree the renewal path.", status: "open", owner: "You (CSM) + Achal Negi", due: due(14), cite: ["hannah_doyle"] },
        { id: "A-S-REN-4", kind: "person", label: "Rhys's successor named and introduced", detail: "Before Rhys leaves in January.", status: sig("champion_leaves") ? "at-risk" : "open", owner: "You (CSM)", due: "2026-12-31", cite: sig("champion_leaves") ? ["champion_leaves"] : ["rhys_calder"] },
        { id: "A-S-REN-5", kind: "money", label: "New order signed", detail: "Sized on real usage per force.", status: "open", owner: "Achal Negi", due: termCap, value: k.renewal, cite: [r("contract.txt")] },
      ],
    });
    chains.push({
      id: "A-C-TENDER", title: "Shape the 300-dock framework tender", why: "The spec has no costed operating model and nobody has agreed who would fly 300 docks.",
      unlocks: "A framework written around a model we can deliver, instead of a price war.", value: money(null, cur, "told", ["rc_tender_0", "rc_tender_2"], "Size told by Rhys; no spec on file."), cite: ["rc_tender_2"],
      steps: [
        { id: "A-S-TEN-1", kind: "deliver", label: "Operating model from Westmere's real data", detail: "Operators per dock, shifts, cost per flight.", status: "open", owner: "Yashash Rao", due: due(30), cite: ["km_staff_2", "km_value_2"] },
        { id: "A-S-TEN-2", kind: "person", label: "Offer it to Hannah as input to the spec", detail: "Before the spec locks (date not on file).", status: "open", owner: "You (CSM) + Achal Negi", due: due(40), cite: ["hannah_doyle", "a_tender"] },
        { id: "A-S-TEN-3", kind: "money", label: "Framework position", detail: "Up to 300 docks.", status: "hypothesis", owner: "Achal Negi", due: due(300), cite: ["rc_tender_0"] },
      ],
    });
  } else if (A === "B") {
    const busy = view.fleet.filter((d) => d.status === "active");
    const low = view.fleet.filter((d) => d.status === "low");
    const stopped = view.fleet.filter((d) => d.flags.some((f) => f.startsWith("stopped") || f.startsWith("fell")));
    const never = view.fleet.filter((d) => d.status === "never" || d.status === "dormant");
    segments.push(
      { id: "busy", name: `Busy docks (${busy.map((d) => d.dockId).join(", ") || "none"})`, docks: busy.length, live: busy.length, missions: busy.reduce((x, d) => x + d.last4, 0), training: null, state: stopped.length ? "fading" : "flying", know: [`${busy.length} docks carry the fleet.`, ...(stopped.length ? [`${stopped.map((d) => d.dockId).join(", ")} stopped in the last 2 weeks while online.`] : [])], give: ["Find out what changed at those plants and restore the schedules."], build: ["Measured patrol results per plant: the case study's evidence.", "Replace contractor night-guarding hours per plant (the real savings case)."], cite: [...busy.map((d) => d.dockId), "B:usage_weekly.csv", "B:calls/2025-08-19_enquiry_call.txt"] },
      { id: "low", name: `Low-use docks (${low.length})`, docks: low.length, live: low.length, missions: low.reduce((x, d) => x + d.last4, 0), training: null, state: "fading", know: ["Fly about once a month: a token patrol.", "No owner per plant; the rollout know-how sits with Stefan's deputy."], give: ["Owner per plant + patrol schedule (deputy session).", "Alert routing like Plant 7 asked for (FB-10944)."], build: ["Weekly patrols at every plant, then a group-wide security report."], cite: [...low.slice(0, 4).map((d) => d.dockId), "sr_repl_2", "FB-10944"] },
      { id: "never", name: `Never flown / offline (${never.map((d) => d.dockId).join(", ") || "none"})`, docks: never.length, live: 0, missions: 0, training: null, state: "not live", know: ["Online but never tasked, or dropping off the plant network (Plant 11, FB-10903).", "AD-01 is most likely the Plant 11 dock (inferred: its offline pattern matches FB-10903 and it missed the 16 Sep update)."], give: ["Named group IT contact; fix the plant link."], build: ["Bring online before the renewal is priced per plant."], cite: [...never.map((d) => d.dockId), "FB-10903", "AD-01", "B:device_events.csv"] },
    );
    chains.push({
      id: "B-C-RENEW", title: `Renew the 14 docks before ${k.termEnds ?? "term end"}`, why: "Finance wants cost per plant; only a few docks earn their cost; Stefan calls renewal 'a formality' and told Sam to ignore finance.",
      unlocks: "The renewal, and a direct line to the payer instead of only Stefan.", value: k.renewal, cite: ["b_renewal", "B:contract.txt"],
      steps: [
        { id: "B-S-REN-1", kind: "usage", label: "Restore the busy docks that stopped", detail: "Ask what changed at those plants; restore patrols before finance sees per-plant numbers.", status: stopped.length ? "at-risk" : "done", owner: "You (CSM) + Pranjal Suyal", due: due(2), cite: stopped.length ? ["usage_drop", ...stopped.map((d) => d.dockId)] : ["B:usage_weekly.csv"] },
        { id: "B-S-REN-2", kind: "deliver", label: "Per-plant usage + cost view to group finance", detail: "Answer the October finance email.", status: "open", owner: "You (CSM) + Achal Negi", due: due(3), cite: ["B:emails/2026-10-08_finance_mailbox.txt"] },
        { id: "B-S-REN-3", kind: "person", label: "Named finance contact (the payer)", detail: "Who signs the renewal on the group side.", status: "open", owner: "You (CSM)", due: due(10), cite: ["B:emails/2026-10-08_finance_mailbox.txt", "B:profile.json"] },
        { id: "B-S-REN-4", kind: "money", label: "Renewal order signed", detail: "Priced per plant on real usage.", status: "open", owner: "Achal Negi", due: termCap, value: k.renewal, cite: ["B:contract.txt"] },
      ],
    });
    chains.push({
      id: "B-C-IDLE", title: "Bring the idle plants into weekly patrol", why: "Most docks fly about once a month; the deputy who knows the rollout leaves soon and nothing is written down.",
      unlocks: "Docks that earn their cost at renewal; then a fair case for Plant 15 and the two plants without docks.", value: money(underusedValue(view, perDock), cur, "backed", ["B:usage_weekly.csv", "B:contract.txt"], "Under-used docks × contract price per dock"), upside: "Plant 15 + two idle plants (the €160k offer declined in the morning).", cite: ["b_idle", "sr_repl_2"],
      steps: [
        { id: "B-S-IDLE-1", kind: "deliver", label: "Deputy session: install list, owner per plant, schedules", detail: "Write down the rollout before he leaves.", status: "at-risk", owner: "You (CSM) + Neel Sharma", due: due(5), cite: ["sr_repl_2", "ba_deputy_0"] },
        { id: "B-S-IDLE-2", kind: "person", label: "Group IT contact for plant networks", detail: "Unblocks FB-10903 (Plant 11) and the weak-signal plants.", status: reqOpen("FB-10903") ? "open" : "done", owner: "Pranjal Suyal", due: due(10), cite: ["FB-10903"] },
        { id: "B-S-IDLE-2b", kind: "deliver", label: "Patrol schedule at every plant: push FR-002 (copy schedule across sites) with SRV, or set them up manually with the deputy", detail: "At rollout, scheduled night patrols were set up only at the plants that asked; the others got a dock online and one trained operator. FR-002 (copy a patrol schedule to other sites) is under review.", status: "open", owner: "You (CSM) + Neel Sharma", due: due(14, termCap), cite: ["FR-002", "B:calls/2026-04-23_rollout_close.txt"] },
        { id: "B-S-IDLE-3", kind: "usage", label: "Every plant patrols weekly", detail: "Owner + schedule at each plant.", status: "blocked", owner: "Plant owners", due: due(45, termCap), cite: ["B:usage_weekly.csv"] },
        { id: "B-S-IDLE-4", kind: "proof", label: "Measured value per plant", detail: "Patrols flown, incidents found, signed off by a plant manager.", status: "open", owner: "You (CSM)", due: due(75), cite: ["sr_roi_0"] },
        { id: "B-S-IDLE-5", kind: "expansion", label: "Re-offer Plant 15 + two idle plants", detail: "Declined in the morning because it came before the value. Re-offer only on proof (lesson L-EXPAND).", status: "hypothesis", owner: "Achal Negi", due: due(120), value: money(160000, "game$", "claim", ["b_more_plants"]), cite: ["b_more_plants"] },
      ],
    });
    chains.push({
      // Hypothesis only: named in the morning debrief; nothing on file mentions insurance. No value, no fact.
      id: "B-C-INSURE", title: "Protect the insurance discount (hypothesis)", why: "Named only in the morning debrief; nothing on file mentions insurance.",
      unlocks: "If true: a reason for group finance to keep (and extend) patrols at every plant, beyond Stefan's case study.",
      value: money(null, cur, "unknown", INSURE_CITE, "Hypothesis: no insurance figure or record on file."), cite: INSURE_CITE,
      steps: [
        { id: "B-S-INS-1", kind: "person", label: "Ask group finance whether the insurer's premium depends on documented night patrols", detail: "Hypothesis to test, not a fact. Night guarding is done by contractors at each plant; finance already wrote asking for cost per plant.", status: "hypothesis", owner: "You (CSM)", due: due(7), cite: INSURE_CITE },
        { id: "B-S-INS-2", kind: "proof", label: "Patrol log per plant for the insurer", detail: "Only if finance confirms: patrols flown per plant per night, from the usage data.", status: "hypothesis", owner: "You (CSM) + Pranjal Suyal", due: due(30), cite: ["B:usage_weekly.csv"] },
        { id: "B-S-INS-3", kind: "money", label: "Keep and extend the discount", detail: "Only if the discount exists and depends on patrols.", status: "hypothesis", owner: "Achal Negi", due: due(90, termCap), cite: INSURE_CITE },
      ],
    });
    chains.push({
      id: "B-C-SISTER", title: "Case study → 40-plant sister company", why: "Stefan wants a case study, but the €1.2M saving is a claim and no plant will be quoted yet.",
      unlocks: "A credible case study and an introduction to a 40-plant sister company.", value: money(null, cur, "claim", ["sr_roi_0", "B:deal_history.json"], "Sister company: Stefan's account only."), cite: ["b_sister"],
      steps: [
        { id: "B-S-SIS-1", kind: "deliver", label: "Savings workings from Stefan, or a measured case", detail: "No number goes out without workings.", status: "open", owner: "Yashash Rao", due: due(14), cite: ["sr_roi_0", "B:contract.txt"] },
        { id: "B-S-SIS-2", kind: "person", label: "A plant manager who will be quoted (Beatriz?)", detail: "Plant 7 uses the docks at night.", status: "open", owner: "You (CSM)", due: due(30), cite: ["ba_use_0", "beatriz_alonso"] },
        { id: "B-S-SIS-3", kind: "proof", label: "Two-page case study", detail: "Measured results at the busiest plants.", status: "open", owner: "Yashash Rao", due: due(60), cite: ["B:emails/2026-09-22_stefan_case_study.txt"] },
        { id: "B-S-SIS-4", kind: "expansion", label: "Introduction to the sister company", detail: "40 plants.", status: "hypothesis", owner: "Achal Negi", due: due(150), cite: ["B:deal_history.json"] },
      ],
    });
  }

  /* ---------------- plan horizons: prerequisites first ---------------- */
  const plan: PlanItem[] = [];
  for (const c of chains) {
    let blockedBefore = false;
    for (const s of c.steps) {
      if (s.status === "done") continue;
      const d = s.due ?? addDays(asOf, 90);
      const days = daysBetween(asOf, d);
      const horizon: PlanItem["horizon"] = days <= 14 && !blockedBefore ? "2w" : days <= 75 ? "quarter" : "12m";
      plan.push({ horizon, stepId: s.id, chainId: c.id, chainTitle: c.title, title: s.label, kind: s.kind, owner: s.owner, due: d, status: s.status, unlocks: c.unlocks, cite: s.cite });
      if (s.status === "blocked" || s.status === "open" || s.status === "at-risk") blockedBefore = true;
    }
  }
  plan.sort((x, y) => x.due.localeCompare(y.due));

  const twoWeeks = plan.filter((p) => p.horizon === "2w").length;
  const headline = chains.length
    ? `${chains.length} plays. Next 2 weeks: ${twoWeeks} steps that unlock everything after them. Upside beyond the renewal: ${chains.filter((c) => c.upside).map((c) => c.upside).join(" ")}`
    : "No plays yet: start with the paperwork and a first conversation.";
  // The morning happened at handover (start of November), before the live events.
  const sortKey = (d: string) => (d === "morning" ? "2026-11-14" : d);
  return { story: { start, events: events.sort((x, y) => sortKey(x.date).localeCompare(sortKey(y.date))), now }, chains, segments, plan, headline };
}

function underusedValue(view: Omit<AccountView, "plan" | "lessons">, perDock: number) {
  return view.fleet.filter((d) => d.status !== "active").length * perDock;
}
