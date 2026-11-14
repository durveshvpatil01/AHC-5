// The rules engine: (export, paperwork, live signals) -> the five answers per account, every item cited.
// Each rule has an id (R-xx) shown in the UI and described in the Thinking doc.
import {
  addDays, buildSources, daysBetween, fleetStats, mergeSignals, peopleOf, profileOf, hasProfile, rec, recCsv, recData, timelineOf, toSignal,
  type RawAccount, type RawExport, type RawPack, type RawSignal,
} from "./model";
import { attachDrafts } from "./drafts";
import type { AccountView, CrmView, Deal, Gap, Kpis, Money, Move, PowerSeat, Risk, Source, Stance } from "./types";

export interface RawInput {
  exp: RawExport;
  packs: RawPack[];
  signals: RawSignal[];
  notes: CrmView["notes"];
  team: CrmView["team"];
  sync: CrmView["sync"];
}

const STANCE_SCORE: Record<Stance, number> = { guarded: 25, neutral: 50, warm: 75, ally: 100, unknown: 0 };
const fmt = (n: number, cur: string) => (cur === "GBP" ? "£" : cur === "EUR" ? "€" : "$") + Math.round(n).toLocaleString("en-GB");

function seat(role: PowerSeat["role"], p: { id: string; name: string; relationship: Stance } | undefined, fallbackName: string, cite: string[], note?: string): PowerSeat {
  return p
    ? { role, personId: p.id, name: p.name, stance: p.relationship, met: true, cite: [p.id, ...cite], note }
    : { role, personId: null, name: fallbackName, stance: "unknown", met: false, cite, note };
}

export function buildCrm(input: RawInput): CrmView {
  const { exp, signals } = input;
  // Every account we know of: in the export, in a paperwork pack, or named by a live event.
  const accIds = [...new Set([...exp.accounts.map((a) => a.id), ...input.packs.map((p) => p.account), ...signals.map((s) => s.account)])].filter(Boolean);
  const basePacks: RawPack[] = accIds.map((id) => input.packs.find((p) => p.account === id) ?? { account: id, records: [] });
  const rawAccounts: RawAccount[] = accIds.map((id) => exp.accounts.find((a) => a.id === id) ?? stubAccount(id, basePacks.find((p) => p.account === id)!, signals));
  const deltas = signalDeltas(basePacks, signals);
  const packs = basePacks.map((p) => mergeSignals(p, signals));
  const fleets: Record<string, ReturnType<typeof fleetStats>> = {};
  packs.forEach((p) => (fleets[p.account] = fleetStats(p)));

  // "Today" in the account world: the latest dated thing we hold.
  const lastWeek = Object.values(fleets).flatMap((f) => f.weeks).sort().pop() ?? "2026-11-01";
  const asOf = [...signals.map((s) => s.dated), addDays(lastWeek, 6)].filter(Boolean).sort().pop()!;

  const sources = buildSources(exp, packs, signals, Object.fromEntries(Object.entries(fleets).map(([k, v]) => [k, v.docks])));
  const accounts = rawAccounts.map((a) => buildAccount(a, packs.find((p) => p.account === a.id)!, signals.filter((s) => s.account === a.id), fleets[a.id], asOf, sources, deltas));

  applyTaskNotes(accounts, input.notes, asOf);
  attachDrafts(accounts);
  // Moves, risks and gaps are sources too, so the Copilot (and any chip) can cite and open them.
  for (const a of accounts) {
    for (const m of a.moves) sources[m.id] = { id: m.id, kind: "move", title: `Move #${m.rank}: ${m.title}`, text: `${m.detail}

Owner: ${m.owner}${m.helpers.length ? ` + ${m.helpers.join(", ")}` : ""} · due ${m.due} · status ${m.status}
Moves deals: ${m.dealIds.join(", ")}
Why: ${m.why}
Score: stake ${Math.round(m.score.stake)} ${m.score.currency} × confidence ${m.score.confidence} ÷ (${m.score.daysLeft} days + 1)
Evidence: ${m.cite.join(", ")}`, meta: `Account ${a.id} · ranked by the rules engine` };
    for (const r of a.risks) sources[r.id] = { id: r.id, kind: "risk", title: `${r.level.toUpperCase()} risk: ${r.title}`, text: `${r.detail}

Turns bad: ${r.turnsBadOn ?? "date not on file"}
Rule: ${r.rule}
Evidence: ${r.cite.join(", ")}`, meta: `Account ${a.id} · rules engine` };
    for (const g of a.gaps) sources[g.id] = { id: g.id, kind: "gap", title: `Unknown: ${g.question}`, text: `${g.why}

Who can tell us: ${g.whoCanTell}
Rule: ${g.rule}
Evidence: ${g.cite.join(", ")}`, meta: `Account ${a.id} · rules engine` };
  }
  return {
    asOf,
    generatedAt: new Date().toISOString(),
    sync: input.sync,
    accounts,
    sources,
    notes: input.notes,
    team: input.team,
  };
}

function buildAccount(a: RawAccount, pack: RawPack, signals: RawSignal[], fleet: ReturnType<typeof fleetStats>, asOf: string, S: Record<string, Source>, deltas: Record<string, string[]>): AccountView {
  void S;
  const A = a.id;
  const r = (p: string) => `${A}:${p}`; // cite a paperwork record
  const prof = profileOf(pack);
  const hasContract = hasProfile(pack) && !!prof.renewal.term_ends;
  const cur = prof.currency;
  const person = (id: string) => a.stakeholders.find((s) => s.id === id);
  const fact = (id: string) => a.facts.find((f) => f.id === id);
  const opp = (id: string) => a.opportunities.find((o) => o.id === id);
  const sig = (id: string) => signals.find((s) => s.id === id);
  const docks = fleet.docks;
  const n = docks.length;
  const perDock = prof.renewal.annual_value / Math.max(n, 1);
  const count = (s: string) => docks.filter((d) => d.status === s).length;
  const idleDocks = docks.filter((d) => d.status === "never" || d.status === "dormant");
  const dropped = docks.filter((d) => d.flags.some((f) => f.startsWith("fell from") || f.startsWith("stopped")));
  const underused = docks.filter((d) => d.status !== "active");
  const flights4 = docks.reduce((x, d) => x + d.last4, 0);
  const flightsP4 = docks.reduce((x, d) => x + d.prev4, 0);
  const requests = recCsv(pack, "requests.csv");
  const openReqs = requests.filter((q) => q.status !== "Closed");
  const unowned = openReqs.filter((q) => !q.owner);
  const termEnds: string | null = prof.renewal.term_ends || null;
  const daysToRenewal: number | null = termEnds ? daysBetween(asOf, termEnds) : null;
  const tb = (d: number) => (termEnds ? addDays(termEnds, d) : null);
  const usageCite = [r("usage_weekly.csv")];

  const renewal: Money = hasContract
    ? { amount: prof.renewal.annual_value, currency: cur, basis: "backed", cite: [r("contract.txt"), r("profile.json"), r("invoices.json")] }
    : { amount: null, currency: cur, basis: "unknown", cite: [], note: "No contract on file yet." };

  /* ---------------- deals (Q1 book + Q2 power) ---------------- */
  const deals: Deal[] = [];
  if (A === "A" && hasContract) {
    const hannah = person("hannah_doyle"), karen = person("karen_mbeki"), rhys = person("rhys_calder");
    const rhysLeaving = !!sig("champion_leaves");
    const tarnNorwoldDocks = 8; // 4 + 4, from the flight log file rows
    deals.push({
      id: "a_renewal", title: "Renew the alliance contract (35 docks)", stage: opp("a_renewal")?.stage ?? "on file", kind: "renewal",
      value: renewal,
      seats: [
        seat("decides", hannah, "Alliance procurement lead", [r("calls/2025-12-16_pilot_review.txt")], "Procurement lead; attended the pilot review and asked to be kept informed. Nobody did."),
        seat("signs", rhys, "Alliance programme office", [r("emails/2026-10-28_renewal.txt"), ...(rhysLeaving ? ["champion_leaves"] : [])], rhysLeaving ? "Leaves the programme in January; successor not named." : "Says he will walk the order through."),
        seat("pays", undefined, "Four forces via Schedule 2 (not held)", [r("invoices.json"), r("contract.txt")], "Invoiced in four parts; the split and addresses are in Schedule 2, held by FlytBase Accounts."),
        seat("uses", karen, "Westmere drone unit", [r("usage_weekly.csv")], "Westmere flies most of the fleet."),
        seat("could block", undefined, "Tarn Valley and Norwold (no contact on file)", ["rc_appetite_2", "flight_log_force_month"], "Their docks have not flown live; unused docks come up at renewal."),
        seat("champions", karen, "Westmere drone unit", ["km_usage_1"]),
      ],
      blocker: "Nobody who signs or pays has been met, and the only signatory route (Rhys) closes in January.",
      blockerCite: ["a_renewal", ...(rhysLeaving ? ["champion_leaves"] : []), r("profile.json")],
      next: "Meet Hannah Doyle with the usage-by-force picture; get Schedule 2 from FlytBase Accounts.",
      deadline: termEnds, deadlineText: "Term ends; no automatic renewal (new order needed before).", evidence: opp("a_renewal")?.evidence ?? [],
    });
    deals.push({
      id: "a_tarn", title: "Tarn Valley and Norwold go live", stage: opp("a_tarn")?.stage ?? "identified", kind: "service",
      value: { amount: tarnNorwoldDocks * perDock, currency: cur, basis: "backed", cite: ["flight_log_force_month", r("contract.txt")], note: `Renewal value tied to their ${tarnNorwoldDocks} docks: ${tarnNorwoldDocks} × ${fmt(perDock, cur)} (contract price per dock).` },
      seats: [
        seat("decides", undefined, "Tarn Valley / Norwold command (not on file)", [r("profile.json")]),
        seat("pays", undefined, "Their share of Schedule 2", [r("invoices.json")]),
        seat("uses", undefined, "Tarn Valley and Norwold operators", ["flight_log_force_month"]),
        seat("could block", rhys, "Alliance programme office", [r("emails/2026-09-03_usage_question.txt")], "Declined calls with the forces whose docks do not fly."),
        seat("champions", karen, "Westmere drone unit", ["rc_appetite_2"], "Talks to the other units."),
      ],
      blocker: "Tarn Valley's docks have been 'awaiting sign-off' since May and Norwold only trains; no contact at either force.",
      blockerCite: ["flight_log_force_month", "rc_appetite_2", "FB-10412"],
      next: "Answer the open document request FB-10412 and ask Karen to introduce her Tarn Valley and Norwold counterparts.",
      deadline: termEnds, deadlineText: "Unused docks will be cut at renewal.", evidence: opp("a_tarn")?.evidence ?? [],
    });
    const stadium = fact("rc_stadium_0");
    deals.push({
      id: "a_westmere", title: "Scale Westmere's fleet", stage: opp("a_westmere")?.stage ?? "identified", kind: "expansion",
      value: { amount: stadium ? 30 * perDock : null, currency: cur, basis: "claim", cite: ["rc_stadium_0", r("contract.txt")], note: "30 docks × contract price per dock, resting on Rhys Calder's claim; nothing in writing from Westmere." },
      seats: [
        seat("decides", undefined, "Westmere command (not met)", [r("profile.json")]),
        seat("pays", undefined, "Westmere / alliance (unknown)", [r("profile.json")]),
        seat("uses", karen, "Westmere drone unit", ["km_staff_2"], "Six part-time operators; 30 docks need nine more and shift cover."),
        seat("champions", karen, "Westmere drone unit", ["km_value_2"]),
        seat("could block", undefined, "Operator capacity", ["km_staff_2"], "Staffing, not hardware, is the limit."),
      ],
      blocker: "No costed operating model: Westmere cannot crew more docks today.",
      blockerCite: ["km_staff_2", "km_value_2"],
      next: "Turn the 5 Dec event into the proof: trained operators + cover, then a cost-per-flight comparison.",
      deadline: null, deadlineText: null, evidence: opp("a_westmere")?.evidence ?? [],
    });
    deals.push({
      id: "a_tender", title: "Position for the 300-dock framework tender", stage: opp("a_tender")?.stage ?? "identified", kind: "new",
      value: { amount: null, currency: cur, basis: "told", cite: ["rc_tender_0", "rc_tender_2"], note: "Size told by Rhys Calder; no specification, timetable or evaluation method on file." },
      seats: [
        seat("decides", hannah, "Alliance procurement lead", ["rc_tender_2"], "Procurement owns a framework tender."),
        seat("signs", rhys, "Alliance programme office", ["rc_tender_0", ...(rhysLeaving ? ["champion_leaves"] : [])], rhysLeaving ? "Leaving in January." : undefined),
        seat("pays", undefined, "Alliance budget holder (not on file)", ["rc_funding_0"], "'The alliance has the budget' is a claim."),
        seat("uses", karen, "Westmere drone unit", ["km_staff_2"]),
      ],
      blocker: "The spec has no costed operating model and nobody has agreed who would fly 300 docks.",
      blockerCite: ["rc_tender_2", "km_staff_2"],
      next: "Offer Hannah an operating-model input to the spec, built from Westmere's real flight and staffing data.",
      deadline: null, deadlineText: opp("a_tender")?.deadline?.text ?? null, evidence: opp("a_tender")?.evidence ?? [],
    });
  } else if (A === "B" && hasContract) {
    const stefan = person("stefan_roy"), beatriz = person("beatriz_alonso");
    const regular = docks.filter((d) => d.status === "active").length;
    deals.push({
      id: "b_renewal", title: "Renew the Aldermoor contract (14 docks)", stage: opp("b_renewal")?.stage ?? "on file", kind: "renewal",
      value: renewal,
      seats: [
        seat("decides", stefan, "Group head of security", [r("contract.txt")], "Signed the first order from the group security budget."),
        seat("pays", undefined, "Group finance (shared mailbox, unnamed)", [r("emails/2026-10-08_finance_mailbox.txt")], "Wants the renewal quote split by plant; nobody replied."),
        seat("uses", beatriz, "Plant managers", [r("emails/2026-09-18_beatriz_alerts.txt")], "Only Plant 7 has a named contact."),
        seat("could block", undefined, "Plants paying for docks that do not fly", [r("emails/2026-10-08_finance_mailbox.txt"), ...usageCite], `${regular} of ${n} docks fly regularly.`),
        seat("champions", stefan, "Group head of security", ["sr_roi_0"], "Champion on paper, guarded with us; his figures are unproven."),
      ],
      blocker: `Finance wants cost per plant, and only ${regular} of ${n} docks earn their cost; Stefan's '13 of 15 flying' does not match the usage.`,
      blockerCite: [r("emails/2026-10-08_finance_mailbox.txt"), "sr_roll_0", ...usageCite],
      next: "Answer the finance mailbox with a per-plant usage view and find out who signs it.",
      deadline: termEnds, deadlineText: "Term ends; no automatic renewal.", evidence: opp("b_renewal")?.evidence ?? [],
    });
    const idle = docks.filter((d) => d.status !== "active");
    deals.push({
      id: "b_idle", title: "Bring the idle plants into regular patrol", stage: opp("b_idle")?.stage ?? "identified", kind: "service",
      value: { amount: idle.length * perDock, currency: cur, basis: "backed", cite: [...usageCite, r("contract.txt")], note: `${idle.length} docks fly less than weekly: ${idle.length} × ${fmt(perDock, cur)} (contract price per dock) of the renewal rests on them.` },
      seats: [
        seat("decides", stefan, "Group head of security", ["sr_repl_2"]),
        seat("uses", undefined, "Stefan Roy's deputy (rollout lead, name not on file)", ["ba_deputy_0", "sr_repl_2"], "Knows how a rollout is done; leaves soon; nothing written down."),
        seat("uses", beatriz, "Plant managers", ["ba_auth_0"], "Can only speak for Plant 7."),
        seat("could block", undefined, "Plant networks / group IT (not on file)", ["FB-10903", r("profile.json")]),
        seat("champions", undefined, "No plant champion yet", [r("profile.json")]),
      ],
      blocker: "The rollout know-how sits in the deputy's head and he leaves soon; there is no owner per plant.",
      blockerCite: ["sr_repl_2", "ba_deputy_0"],
      next: "Get the deputy in a room before he leaves: install list, per-plant owner, patrol schedule.",
      deadline: null, deadlineText: opp("b_idle")?.deadline?.text ?? null, evidence: opp("b_idle")?.evidence ?? [],
    });
    deals.push({
      id: "b_sister", title: "Case study for the 40-plant sister company", stage: "on file", kind: "new",
      value: { amount: null, currency: cur, basis: "claim", cite: [r("deal_history.json"), r("emails/2026-09-22_stefan_case_study.txt"), "sr_roi_0"], note: "Stefan Roy's account only; depends on a €1.2M saving nobody has seen worked out." },
      seats: [
        seat("decides", undefined, "Sister company (no contact on file)", [r("deal_history.json")]),
        seat("champions", stefan, "Group head of security", [r("emails/2026-09-22_stefan_case_study.txt")]),
        seat("could block", undefined, "The unproven savings figure", ["sr_roi_0", r("contract.txt")], "The order form quotes no savings figure."),
      ],
      blocker: "The headline saving is a claim, and no plant has agreed to be quoted.",
      blockerCite: ["sr_roi_0", r("calls/2026-10-13_check_in.txt")],
      next: "Build the case study on measured usage at the 4 busy plants, not on the €1.2M claim.",
      deadline: null, deadlineText: null, evidence: [],
    });
  }
  // Generic: any opportunity in the export that no tailored rule covered (new deals, new accounts).
  a.opportunities.filter((o) => !deals.some((d) => d.id === o.id)).forEach((o) => {
    const qualified = ["qualified", "cleared", "agreed"].includes(o.stage);
    deals.push({
      id: o.id, title: o.title, stage: o.stage, kind: /renew/i.test(o.title) ? "renewal" : "new",
      value: o.worth_up_to != null && qualified
        ? { amount: o.worth_up_to, currency: "game$", basis: "backed", cite: [o.id, ...o.evidence], note: "Worth shown by the game once qualified." }
        : { amount: null, currency: cur, basis: "unknown", cite: [o.id], note: "Not qualified: nobody who decides or pays has been met." },
      seats: [
        seat("decides", undefined, "Not met yet", [o.id]),
        seat("pays", undefined, "Not met yet", [o.id]),
        ...a.stakeholders.map((s) => seat("uses", s, s.name, [], "Role on this deal not yet confirmed.")),
      ],
      blocker: o.blocker, blockerCite: o.blocker ? [o.id] : [],
      next: qualified ? "Prepare the fix for the blocker and send it to the person who can approve it." : "Qualify it: ask who decides, who pays and who signs.",
      deadline: null, deadlineText: o.deadline?.text ?? null, evidence: o.evidence,
    });
  });
  // Offers from the morning (won = book; declined = parked)
  a.offers.forEach((o) =>
    deals.push({
      id: o.id, title: o.title, stage: o.status === "won" ? "offer-won" : `offer-${o.status}`, kind: "offer",
      value: { amount: o.value, currency: "game$", basis: o.status === "won" ? "backed" : "claim", cite: [o.id], note: o.status === "won" ? `Agreed with ${o.pitch_to} this morning; must now be delivered.` : `Declined by ${o.pitch_to}; parked.` },
      seats: [seat(o.status === "won" ? "decides" : "could block", a.stakeholders.find((s) => s.name === o.pitch_to), o.pitch_to, [o.id])],
      blocker: null, blockerCite: [], next: o.status === "won" ? "Deliver it: dates and named contact in writing." : "Do not re-pitch until the usage case is made.",
      deadline: null, deadlineText: null, evidence: [],
    }),
  );

  /* ---------------- people ---------------- */
  const people = peopleOf(a, pack);

  /* ---------------- risks (Q4) ---------------- */
  const risks: Risk[] = [];
  const idleShare = idleDocks.length / Math.max(n, 1);
  if (idleShare >= 0.15)
    risks.push({ id: `${A}-R-USAGE`, level: idleShare >= 0.25 ? "red" : "amber", title: `${idleDocks.length} of ${n} docks flew nothing in the last 4 weeks`, detail: `${count("never")} have never flown, ${count("dormant")} stopped. That is ${fmt(idleDocks.length * perDock, cur)} of the renewal paying for idle kit.`, turnsBadOn: tb(-90), rule: "R-USAGE: share of docks with zero flights in 4 weeks ≥ 15% (red ≥ 25%); turns bad 90 days before term end, when the renewal is priced.", cite: [...usageCite, ...idleDocks.slice(0, 6).map((d) => d.dockId)] });
  if (dropped.length)
    risks.push({ id: `${A}-R-DROP`, level: "red", title: `${dropped.length} busy dock${dropped.length > 1 ? "s" : ""} suddenly stopped`, detail: dropped.map((d) => `${d.dockId}: ${d.flags.find((f) => f.startsWith("fell") || f.startsWith("stopped"))}`).join("; ") + ". Still online, so it is not hardware: someone stopped tasking them.", turnsBadOn: asOf, rule: "R-DROP: a busy dock (≥ 3 flights/week) flew nothing for 2 weeks, or fell to ≤ 25% of its previous 4 weeks.", cite: [...dropped.map((d) => d.dockId), ...usageCite, ...signals.filter((s) => s.id === "usage_drop").map((s) => s.id)] });
  for (const q of unowned) {
    const urgent = /urgent/i.test(q.summary) || (q.opened && daysBetween(q.opened, asOf) > 30);
    risks.push({ id: `${A}-R-OPEN-${q.request_id}-${q.opened}`, level: urgent ? "red" : "amber", title: `Unanswered: ${q.summary.split(".")[0]}`, detail: `${q.from} · opened ${q.opened} · no owner · ${daysBetween(q.opened, asOf)} days.`, turnsBadOn: /5 December/.test(q.summary) ? "2026-12-05" : q.opened ? addDays(q.opened, 14) : null, rule: "R-OPEN: an open request with no owner (red if marked urgent or older than 30 days).", cite: [q.request_id !== "(none)" ? q.request_id : r("requests.csv")] });
  }
  if (sig("champion_leaves"))
    risks.push({ id: `${A}-R-CHAMP`, level: "red", title: "Single-threaded and the thread is leaving", detail: "Every call since May was with Rhys Calder alone; he leaves in January with no successor named.", turnsBadOn: "2027-01-01", rule: "R-THREAD: the only contact on file leaves before the renewal.", cite: ["champion_leaves", r("profile.json")] });
  else if (/alone/.test(prof.contacts_on_file[0]?.note ?? ""))
    risks.push({ id: `${A}-R-THREAD`, level: "amber", title: "Single-threaded account", detail: prof.contacts_on_file[0].note, turnsBadOn: tb(-90), rule: "R-THREAD: one contact on every call.", cite: [r("profile.json")] });
  a.stakeholders.filter((s) => s.relationship === "guarded").forEach((s) =>
    risks.push({ id: `${A}-R-COLD-${s.id}`, level: "amber", title: `${s.name} is guarded with us`, detail: `${s.role}. Guarded after this morning; a careless ask now costs more trust.`, turnsBadOn: null, rule: "R-COLD: a met stakeholder on a live deal is guarded.", cite: [s.id] }),
  );
  a.deadlines.filter((d) => !d.passed).forEach((d, i) =>
    risks.push({ id: `${A}-R-DEADLINE-${i}`, level: "amber", title: d.text.split(".")[0], detail: d.text + " The date is not on file.", turnsBadOn: null, rule: "R-DEADLINE: a known game deadline that has not passed.", cite: a.opportunities.filter((o) => o.deadline?.text === d.text).map((o) => o.id) }),
  );
  if (daysToRenewal != null && daysToRenewal < 120)
    risks.push({ id: `${A}-R-RENEWAL`, level: daysToRenewal < 75 ? "red" : "amber", title: `Renewal in ${daysToRenewal} days, still at '${opp(A === "A" ? "a_renewal" : "b_renewal")?.stage ?? "on file"}'`, detail: `Term ends ${termEnds} with no automatic renewal; a new order is needed first.`, turnsBadOn: tb(-45), rule: "R-RENEWAL: < 120 days to term end and the deal is not qualified (red < 75).", cite: [r("contract.txt")] });
  const claims = a.facts.filter((f) => f.status === "claim");
  if (claims.length)
    risks.push({ id: `${A}-R-CLAIM`, level: "amber", title: `The official story rests on ${claims.length} claim${claims.length > 1 ? "s" : ""}`, detail: claims.map((c) => `“${c.text}” (${c.said_by})`).join(" · "), turnsBadOn: null, rule: "R-CLAIM: a fact with status 'claim' that the plan would otherwise depend on.", cite: claims.map((c) => c.id) });
  const conn = docks.filter((d) => d.connLost >= 10);
  if (conn.length)
    risks.push({ id: `${A}-R-CONN`, level: "amber", title: `${conn.length} dock${conn.length > 1 ? "s" : ""} keep dropping off the network`, detail: conn.map((d) => `${d.dockId} (${d.connLost} drops)`).join(", ") + ".", turnsBadOn: null, rule: "R-CONN: ≥ 10 connection drops in 8 weeks.", cite: [...conn.map((d) => d.dockId), r("device_events.csv"), ...(rec(pack, "tickets.json") ? [] : [])] });
  const batt = docks.filter((d) => d.battery >= 5);
  if (batt.length)
    risks.push({ id: `${A}-R-BATT`, level: "amber", title: `Battery warnings on ${batt.map((d) => d.dockId).join(", ")}`, detail: "Matches Karen Mbeki's unanswered email: batteries do not last a night shift.", turnsBadOn: null, rule: "R-BATT: ≥ 5 battery health warnings on one dock.", cite: [...batt.map((d) => d.dockId), r("emails/2026-08-11_karen_batteries.txt")] });
  const order: Record<string, number> = { red: 0, amber: 1, green: 2, grey: 3 };
  risks.sort((x, y) => order[x.level] - order[y.level] || (x.turnsBadOn ?? "9999").localeCompare(y.turnsBadOn ?? "9999"));

  /* ---------------- gaps (Q5) ---------------- */
  const gaps: Gap[] = [];
  const who = (t: string) =>
    /finance|budget/i.test(t) ? "FlytBase Accounts / Achal Negi (commercial owner)" :
    /procurement/i.test(t) ? "Hannah Doyle (met: alliance procurement lead)" :
    /which dock|install|site/i.test(t) ? "FlytBase field team (install sheets) / Pranjal Suyal" :
    /deputy/i.test(t) ? "Beatriz Alonso (named him) / Stefan Roy" :
    /IT/.test(t) ? "Stefan Roy / the plant manager at Plant 11" :
    /Metro Central|Tarn Valley|Norwold|plant/i.test(t) ? (A === "A" ? "Insp. Karen Mbeki (talks to the other units)" : "Beatriz Alonso / group finance") : "Neel Sharma";
  prof.not_on_file.forEach((t, i) => gaps.push({ id: `${A}-G-FILE-${i}`, question: t.replace(/\.$/, "") + "?", why: "The plan needs this person or record and FlytBase does not hold it.", whoCanTell: who(t), rule: "R-GAP-FILE: listed as not on file in the account profile.", cite: [r("profile.json")] }));
  claims.forEach((c) => gaps.push({ id: `${A}-G-CLAIM-${c.id}`, question: `Is it true that “${c.text.replace(/\.$/, "")}”?`, why: `Only ${c.said_by}'s word. Shown apart from the backed book until a file proves it.`, whoCanTell: c.id === "sr_roi_0" ? "Group finance (the workings) and plant managers" : c.id === "sr_roll_0" ? "Usage data says otherwise; ask plant managers" : c.id === "rc_appetite_0" ? "The force leads at Tarn Valley and Norwold" : c.id === "rc_funding_0" ? "Hannah Doyle / alliance finance" : "Insp. Karen Mbeki", rule: "R-GAP-CLAIM: a fact with status 'claim'.", cite: [c.id] }));
  a.opportunities.filter((o) => o.worth_up_to == null).forEach((o) => gaps.push({ id: `${A}-G-WORTH-${o.id}`, question: `What is “${o.title}” really worth, and who pays?`, why: "The deal is not qualified: no decider or payer met, so the game shows no worth.", whoCanTell: o.id.includes("tender") ? "Hannah Doyle" : o.id.includes("tarn") ? "Tarn Valley / Norwold force leads (via Karen Mbeki)" : o.id.includes("westmere") ? "Insp. Karen Mbeki → Westmere command" : o.id.includes("renewal") ? (A === "A" ? "Hannah Doyle + Schedule 2 from FlytBase Accounts" : "Group finance mailbox → named finance lead") : "Stefan Roy's deputy", rule: "R-GAP-WORTH: stage 'identified' with no worth.", cite: [o.id] }));
  a.deadlines.filter((d) => !d.passed).forEach((d, i) => gaps.push({ id: `${A}-G-DATE-${i}`, question: `When exactly: “${d.text.split(".")[0]}”?`, why: "A deadline with no date cannot be planned inside.", whoCanTell: A === "A" ? "Hannah Doyle (spec owner)" : "Beatriz Alonso / Stefan Roy", rule: "R-GAP-DATE: known deadline without a date.", cite: a.opportunities.filter((o) => o.deadline?.text === d.text).map((o) => o.id) }));
  if (A === "A" && rec(pack, "requests.csv")?.text?.includes("FB-10412"))
    gaps.push({ id: "A-G-10412", question: "Who sent document request FB-10412, and is it what Tarn Valley's sign-off is waiting for?", why: "Tarn Valley has been 'awaiting sign-off' since May; an unanswered force-level document request has been open since June. If they are the same thing, a reply unlocks 4 docks.", whoCanTell: "FlytBase support desk (requester details)", rule: "R-GAP-LINK: two open items on the same account in the same window.", cite: ["FB-10412", "flight_log_force_month"] });

  /* ---------------- moves (Q3) ---------------- */
  const moves: Move[] = [];
  const mk = (m: Omit<Move, "rank" | "score" | "status" | "plannedOwner" | "plannedDue" | "history" | "draft"> & { stake: number; currency: string; confidence: number }): void => {
    const daysLeft = Math.max(daysBetween(asOf, m.due), 0);
    const total = (m.stake * m.confidence) / (daysLeft + 1);
    const { stake, currency, confidence, ...rest } = m;
    moves.push({ ...rest, rank: 0, score: { stake, currency, daysLeft, confidence, total }, status: "open", plannedOwner: rest.owner, plannedDue: rest.due, history: [] });
  };
  const due = (days: number, cap?: string) => { const d = addDays(asOf, days); return cap && d > cap ? cap : d; };

  if (A === "A" && hasContract) {
    const ev = sig("urgent_request");
    if (ev)
      mk({ id: "A-M-EVENT", title: "Reply to Karen in writing: training dates + named cover for 5 Dec", detail: "Confirm how many officers are trained and when (Pranjal to book the sessions), and name who answers a dock failure on the day with a response time. This delivers the two offers she agreed this morning.", owner: "You (CSM)", helpers: ["Pranjal Suyal"], due: due(1, "2026-12-04"), dealIds: ["a_training", "a_priority_support", "a_westmere"], why: "R-MOVE: unanswered urgent ask from the account's only ally, with a hard date.", cite: ["urgent_request", "FB-11206", "a_training", "a_priority_support", "km_staff_2", "flight_log_force_month"], noteText: "Reply to Insp. Karen Mbeki before 5 Dec event: operator training dates (Pranjal to book) and named day-of support cover with response time. Delivers won offers a_training + a_priority_support. Ticket FB-11206.", stake: 18 * perDock, currency: cur, confidence: 0.9 });
    mk({ id: "A-M-SUCCESSOR", title: "Multi-thread the renewal before Rhys leaves", detail: "Book Hannah Doyle (procurement) with the usage-by-force picture; ask Rhys to name his successor and introduce the four force leads while he still can.", owner: "You (CSM)", helpers: ["Achal Negi"], due: due(7, "2026-12-31"), dealIds: ["a_renewal", "a_tender"], why: "R-MOVE: renewal value × the only signatory route closing.", cite: ["a_renewal", "hannah_doyle", ...(sig("champion_leaves") ? ["champion_leaves"] : []), r("profile.json")], noteText: "Meet Hannah Doyle (procurement) on the 35-dock renewal with usage by force; ask Rhys Calder to name his successor and introduce force leads before he leaves in January. Owner: CSM + Achal Negi.", stake: prof.renewal.annual_value, currency: cur, confidence: 0.6 });
    mk({ id: "A-M-SCHEDULE2", title: "Get Schedule 2 and the install sheets from inside FlytBase", detail: "Accounts holds who pays which quarter of the £350k; the field team holds which dock is at which force. Together they turn the idle docks into named forces.", owner: "You (CSM)", helpers: ["Achal Negi", "Pranjal Suyal"], due: due(2), dealIds: ["a_renewal", "a_tarn"], why: "R-MOVE: cheapest move that fills the biggest gaps (payer + dock-to-force).", cite: [r("invoices.json"), r("internal_notes.json"), r("profile.json")], noteText: "Internal ask: FlytBase Accounts for Schedule 2 (who pays each of the four invoice parts) and the field team for the ECPA install sheets (dock-to-force map).", stake: prof.renewal.annual_value, currency: cur, confidence: 0.35 });
    if (rec(pack, "requests.csv")?.text?.includes("FB-10412,"))
      mk({ id: "A-M-10412", title: "Close FB-10412 and open Tarn Valley", detail: "Find the requester, send the document, and ask whether this is what their sign-off is waiting for. Ask Karen for her Tarn Valley and Norwold counterparts.", owner: "You (CSM)", helpers: ["Support desk"], due: due(3), dealIds: ["a_tarn"], why: "R-MOVE: 8 idle paid-for docks; a 5-month-old unanswered request.", cite: ["FB-10412", "flight_log_force_month", "rc_appetite_2"], noteText: "Close document request FB-10412 (open since 29 Jun, chased); check if it is Tarn Valley's pending sign-off; ask Karen Mbeki to introduce Tarn Valley and Norwold leads.", stake: 8 * perDock, currency: cur, confidence: 0.5 });
    mk({ id: "A-M-TENDER", title: "Offer a costed operating model for the tender spec", detail: "Use Westmere's flights and staffing (6 part-time operators; 9 more for 30 docks) to show what 300 docks need. Gives Hannah the missing piece.", owner: "Yashash Rao", helpers: ["You (CSM)", "Achal Negi"], due: due(14), dealIds: ["a_tender"], why: "R-MOVE: large deal, unknown lock date: act early but after the renewal threads.", cite: ["rc_tender_2", "km_staff_2", "km_value_2"], noteText: "Draft a costed operating model (operators, shifts, cost per flight) from Westmere data as input to the 300-dock tender spec; offer to Hannah Doyle.", stake: prof.renewal.annual_value, currency: cur, confidence: 0.2 });
  } else if (A === "B" && hasContract) {
    const drop = sig("usage_drop");
    if (drop && dropped.length)
      mk({ id: "B-M-DROP", title: `Find out why ${dropped.map((d) => d.dockId).join(", ")} stopped flying`, detail: "They stayed online, so ask what changed at those plants (schedule switched off? alert fatigue? operator left?). Restore the patrols before finance sees a 'per plant' quote.", owner: "You (CSM)", helpers: ["Pranjal Suyal"], due: due(2), dealIds: ["b_renewal", "b_idle"], why: "R-MOVE: the busiest docks are the renewal's proof; silence with no ticket.", cite: ["usage_drop", ...dropped.map((d) => d.dockId), r("usage_weekly.csv")], noteText: `Investigate why ${dropped.map((d) => d.dockId).join(", ")} stopped flying (online, no ticket). Pranjal to check schedules/alerts; CSM to call the plants.`, stake: prof.renewal.annual_value, currency: cur, confidence: 0.75 });
    mk({ id: "B-M-FINANCE", title: "Answer group finance with a per-plant usage view", detail: "They asked for cost per plant in October and nobody replied. Send usage per dock alongside cost, and ask who signs the renewal.", owner: "You (CSM)", helpers: ["Achal Negi"], due: due(3), dealIds: ["b_renewal"], why: "R-MOVE: the payer has written to us; renewal in < 3 months.", cite: [r("emails/2026-10-08_finance_mailbox.txt"), r("requests.csv"), r("usage_weekly.csv"), r("contract.txt")], noteText: "Reply to Aldermoor group finance (Oct 8 email, unanswered): per-plant cost + usage view for the renewal; ask who signs. Owner CSM + Achal Negi.", stake: prof.renewal.annual_value, currency: cur, confidence: 0.6 });
    mk({ id: "B-M-DEPUTY", title: "Capture the deputy's rollout playbook before he leaves", detail: "Ask Stefan for a working session with his deputy: the install list, one owner per plant, patrol schedules. Write it down.", owner: "You (CSM)", helpers: ["Neel Sharma"], due: due(5), dealIds: ["b_idle", "b_renewal"], why: "R-MOVE: a deadline that destroys know-how; nothing is written down.", cite: ["sr_repl_2", "ba_deputy_0", "b_idle", r("calls/2026-04-23_rollout_close.txt")], noteText: "Book a session with Stefan Roy's deputy before he leaves: install list, owner per plant, patrol schedules. Write the rollout playbook down.", stake: (docks.length - docks.filter((d) => d.status === "active").length) * perDock, currency: cur, confidence: 0.5 });
    mk({ id: "B-M-PLANT11", title: "Unstick FB-10903: Plant 11 dock keeps dropping off", detail: "Pending the customer's IT since September. Get a named IT contact through Stefan or the plant manager.", owner: "Pranjal Suyal", helpers: ["You (CSM)"], due: due(7), dealIds: ["b_idle"], why: "R-MOVE: a known fix waiting on a contact we don't have.", cite: ["FB-10903", r("device_events.csv")], noteText: "FB-10903 Plant 11 connectivity: get a named group IT contact; Pranjal to work the link with them.", stake: perDock, currency: cur, confidence: 0.6 });
    mk({ id: "B-M-SAVINGS", title: "Rebuild the case study on measured usage, not the €1.2M claim", detail: "Patrol hours and incidents at the 4 busiest docks, signed off by a plant manager. Ask Stefan for the savings workings before anything goes to the sister company.", owner: "Yashash Rao", helpers: ["You (CSM)"], due: due(14), dealIds: ["b_sister"], why: "R-MOVE: big upside but rests on a claim; verify before publishing.", cite: ["sr_roi_0", r("contract.txt"), r("emails/2026-09-22_stefan_case_study.txt")], noteText: "Case study for sister company: base it on measured patrols at the busiest docks; request Stefan Roy's savings workings first (claim sr_roi_0).", stake: prof.renewal.annual_value, currency: cur, confidence: 0.2 });
  }
  for (const s of signals.filter((x) => !KNOWN_SIGNALS.has(x.id))) {
    const text = `${s.title} ${s.summary}`;
    const hot = /urgent|leav|stop|cancel|complain|terminat|churn|escalat|outage|fail|nobody|no reply|before/i.test(text);
    const when = dateIn(s.summary, s.dated);
    const turns = when ?? addDays(s.dated > asOf ? s.dated : asOf, 7);
    const recIds = s.records.map((x) => `${A}:${x.path.replace(/^[A-Z]\//, "")}`).filter((id) => id in S);
    risks.push({ id: `${A}-R-SIGNAL-${s.id}`, level: hot ? "red" : "amber", title: s.title.replace(/^[^:]+:\s*/, ""), detail: s.summary, turnsBadOn: turns, rule: "R-SIGNAL: a new live event on the account; red when it signals urgency, a departure, a stop or no reply.", cite: [s.id, ...recIds] });
    const renewalDeal = deals.find((d) => d.kind === "renewal");
    mk({
      id: `${A}-M-SIGNAL-${s.id}`, title: `Respond: ${s.title.replace(/^[^:]+:\s*/, "")}`,
      detail: `New live event dated ${s.dated}. ${s.summary} Acknowledge in writing, name an owner, and check what it changes for the deals on this account.`,
      owner: "You (CSM)", helpers: ["Neel Sharma"], due: [addDays(s.dated > asOf ? s.dated : asOf, hot ? 1 : 3), ...(when ? [addDays(when, -1)] : [])].map((d) => (d < asOf ? asOf : d)).sort()[0],
      dealIds: renewalDeal ? [renewalDeal.id] : deals.slice(0, 1).map((d) => d.id), why: "R-MOVE-SIGNAL: every new live event gets an owner and a reply date.",
      cite: [s.id, ...recIds], noteText: `Live event ${s.id} (${s.dated}): ${s.summary} Owner: CSM. Acknowledge and assess impact on the renewal.`,
      stake: renewal.amount ?? perDock * Math.max(n, 1), currency: cur, confidence: hot ? 0.7 : 0.4,
    });
  }
  // A new account (no contract on file yet): make the gaps the first moves.
  if (!hasContract) {
    mk({ id: `${A}-M-INTRO`, title: `Get the contract and a first call on ${a.name}`, detail: "No contract, renewal date or usage on file. Ask Achal (commercial owner) for the order form and Neel for the handover, then book an introduction with whoever we have met.", owner: "You (CSM)", helpers: ["Achal Negi", "Neel Sharma"], due: addDays(asOf, 2), dealIds: deals.slice(0, 1).map((d) => d.id), why: "R-MOVE-NEW: a new account starts with its paperwork and a first conversation.", cite: [...a.opportunities.map((o) => o.id), ...signals.map((x) => x.id)].slice(0, 4), noteText: `New account ${a.name}: request order form from Achal Negi and handover from Neel Sharma; book intro call.`, stake: 1, currency: cur, confidence: 0.5 });
  }
  moves.sort((x, y) => y.score.total - x.score.total).forEach((m, i) => (m.rank = i + 1));

  /* ---------------- KPIs + health ---------------- */
  const active = count("active");
  const avgStance = a.stakeholders.length ? a.stakeholders.reduce((x, s) => x + STANCE_SCORE[s.relationship], 0) / a.stakeholders.length : 0;
  const supportScore = Math.max(0, 100 - 25 * unowned.length);
  const usageScore = (active / Math.max(n, 1)) * 100;
  const health = {
    score: Math.round(0.5 * usageScore + 0.25 * avgStance + 0.25 * supportScore),
    parts: [
      { name: "Usage", value: Math.round(usageScore), weight: 0.5, note: `${active}/${n} docks flew ≥ 4 times in the last 4 weeks` },
      { name: "Relationships", value: Math.round(avgStance), weight: 0.25, note: `Average stance of ${a.stakeholders.length} people met (guarded 25 → ally 100)` },
      { name: "Support", value: supportScore, weight: 0.25, note: `${unowned.length} open request${unowned.length === 1 ? "" : "s"} with no owner (−25 each)` },
    ],
  };
  const kpis: Kpis = {
    renewal, termEnds, daysToRenewal, docks: n, active, low: count("low"), dormant: count("dormant"), never: count("never"),
    utilisation: active / Math.max(n, 1), flightsLast4: flights4, flightsPrev4: flightsP4, openItems: openReqs.length,
    offersWon: a.offers.filter((o) => o.status === "won").reduce((x, o) => x + o.value, 0), health,
  };

  /* ---------------- stories + one-line answers ---------------- */
  const backed = deals.filter((d) => d.value.basis === "backed" && d.value.amount && d.kind !== "offer" && d.kind === "renewal").reduce((x, d) => x + (d.value.amount ?? 0), 0);
  const unbackedCount = deals.filter((d) => d.value.basis === "claim" || d.value.amount == null).length;
  const dataStory = n === 0 ? "No usage data on file for this account yet: everything below comes from the export and live events." : A === "A"
    ? `${active} of ${n} docks fly regularly; ${count("never")} have never flown and ${count("dormant")} have stopped. Only Westmere and Metro Central fly operationally.`
    : `${active} of ${n} docks fly regularly (not "13 of 15 plants"); ${count("never")} never flew, and the busiest docks ${dropped.length ? `include ${dropped.length} that just stopped` : "carry the fleet"}.`;
  const unknownSeats = deals.filter((d) => d.kind !== "offer").flatMap((d) => d.seats).filter((s) => !s.met).length;
  const answers = {
    book: `${fmt(backed, cur)} renewal is backed by the contract; ${fmt(underused.length * perDock, cur)} of it pays for ${underused.length} docks that fly less than weekly. ${unbackedCount} item${unbackedCount === 1 ? "" : "s"} rest on claims or have no value yet.`,
    power: `${a.stakeholders.length} people met (${a.stakeholders.map((s) => `${s.name.split(" ").pop()} ${s.relationship}`).join(", ")}); ${unknownSeats} decision seats are held by people we have never met.`,
    first: moves.slice(0, 3).map((m) => `${m.rank}. ${m.title} (${m.owner}, by ${m.due})`).join(" · "),
    wrong: `${risks.filter((x) => x.level === "red").length} red, ${risks.filter((x) => x.level === "amber").length} amber. First to turn bad: ${risks.filter((x) => x.turnsBadOn).sort((x, y) => (x.turnsBadOn! < y.turnsBadOn! ? -1 : 1))[0]?.title ?? "n/a"}.`,
    unknown: `${gaps.length} gaps; the plan rests most on: ${gaps[0]?.question ?? "none"}`,
  };

  return {
    id: A, name: a.name, sector: prof.sector, currency: cur, officialStory: a.official_story, dataStory,
    dataStoryCite: [...usageCite, ...(A === "A" ? ["rc_appetite_2", "flight_log_force_month"] : ["sr_roll_0"])],
    kpis, deals, people, moves, risks, gaps, fleet: docks, weeks: fleet.weeks.slice(-12), timeline: timelineOf(pack, signals),
    signals: signals.map((s) => toSignal(s, [...impactOf(s.id, A), ...(deltas[s.id] ?? [])])), answers,
    discovery: discoveryOf(a, deals, docks, prof, S, people.filter((p) => !p.met).length),
  };
}

function impactOf(id: string, A: string): string[] {
  if (id === "champion_leaves") return ["Risk: single thread leaving (red)", "Move re-ranked: multi-thread the renewal", "Power: signatory seat now at risk"];
  if (id === "urgent_request") return ["New ticket FB-11206 merged into requests", "Move #1: reply to Karen before 5 Dec", "Risk: unanswered urgent request (red)"];
  if (id === "usage_drop") return ["4 new usage weeks merged into the fleet view", "Risk: busy docks stopped (red)", "Move: find out why"];
  return [`New live event on account ${A}`];
}

export { recData };

/* ---------- generic handling for anything the tailored rules do not know ---------- */
export const KNOWN_SIGNALS = new Set(["champion_leaves", "urgent_request", "usage_drop"]);

/** A minimal account built from a live event or a pack when the export does not list it yet. */
function stubAccount(id: string, pack: RawPack, signals: RawSignal[]): RawAccount {
  const prof = recData<{ name?: string }>(pack, "profile.json");
  const fromSignal = signals.find((s) => s.account === id)?.title.split(":")[0];
  return { id, name: prof?.name ?? fromSignal ?? `Account ${id}`, official_story: "", stakeholders: [], facts: [], opportunities: [], offers: [], deadlines: [] };
}

/** What each live event changed: apply events in date order and diff the key numbers before and after. */
function signalDeltas(packs: RawPack[], signals: RawSignal[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const metrics = (p: RawPack) => {
    const f = fleetStats(p).docks;
    const req = recCsv(p, "requests.csv").filter((q) => q.status !== "Closed");
    return {
      "Active docks": f.filter((d) => d.status === "active").length,
      "Docks idle 4 wks": f.filter((d) => d.status === "never" || d.status === "dormant").length,
      "Busy docks that went silent": f.filter((d) => d.flags.some((x) => x.startsWith("stopped") || x.startsWith("fell"))).length,
      "Open requests with no owner": req.filter((q) => !q.owner).length,
    } as Record<string, number>;
  };
  for (const pack of packs) {
    let cur = pack;
    for (const s of signals.filter((x) => x.account === pack.account).sort((x, y) => x.dated.localeCompare(y.dated))) {
      const before = metrics(cur);
      const rowsBefore = Object.fromEntries(cur.records.map((r) => [r.path, (r.text ?? "").trim().split("\n").length]));
      cur = mergeSignals(cur, [s]);
      const after = metrics(cur);
      const lines: string[] = [];
      for (const k of Object.keys(after)) if (after[k] !== before[k]) lines.push(`${k}: ${before[k]} → ${after[k]}`);
      for (const r of cur.records) {
        const was = rowsBefore[r.path];
        if (was == null) lines.push(`New record on file: ${r.path}`);
        else if (r.path.endsWith(".csv")) {
          const now = (r.text ?? "").trim().split("\n").length;
          if (now > was) lines.push(`+${now - was} rows merged into ${r.path}`);
        }
      }
      out[s.id] = lines.map((l) => `Δ ${l}`);
    }
  }
  return out;
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
/** First "5 December"-style date in a text, resolved against the event's date. */
export function dateIn(text: string, dated: string): string | null {
  const m = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\b/i);
  if (!m) return null;
  let y = Number(dated.slice(0, 4));
  const mm = MONTHS.indexOf(m[2].toLowerCase()) + 1;
  const iso = `${y}-${String(mm).padStart(2, "0")}-${String(Number(m[1])).padStart(2, "0")}`;
  if (iso < dated) y += 1;
  return `${y}-${iso.slice(5)}`;
}

/* ---------- tasks: the to-do state lives in the game, as notes we wrote with write_note ---------- */
// A task update is a note titled "task:<moveId>" whose text holds key=value pairs, e.g.
// "status=done; owner=Pranjal Suyal; due=2026-12-04; by=CSM". The latest update per move wins.
export function parseTaskNote(n: { title?: string; text: string }): { moveId: string; fields: Record<string, string> } | null {
  const m = (n.title ?? "").match(/^task:([\w-]+)/);
  if (!m) return null;
  const fields: Record<string, string> = {};
  for (const part of n.text.split(/;\s*/)) {
    const kv = part.match(/^\s*(\w+)\s*=\s*(.+?)\s*$/);
    if (kv) fields[kv[1].toLowerCase()] = kv[2];
  }
  return { moveId: m[1], fields };
}

function applyTaskNotes(accounts: AccountView[], notes: CrmView["notes"], asOf: string) {
  const sorted = [...notes].sort((a, b) => String(a.at ?? "").localeCompare(String(b.at ?? "")));
  for (const n of sorted) {
    const t = parseTaskNote(n);
    if (!t) continue;
    const mv = accounts.flatMap((a) => a.moves).find((m) => m.id === t.moveId);
    if (!mv) continue;
    const f = t.fields;
    if (f.status === "done" || f.status === "open" || f.status === "snoozed") mv.status = f.status;
    if (f.owner) mv.owner = f.owner;
    if (f.due && /^\d{4}-\d{2}-\d{2}$/.test(f.due)) mv.due = f.due;
    mv.history.push({ at: String(n.at ?? ""), text: n.text, noteId: String(n.id ?? "") });
  }
  // Re-rank: open moves by score (with any new due date); done and snoozed go to the bottom.
  for (const a of accounts) {
    for (const m of a.moves) {
      const daysLeft = Math.max(daysBetween(asOf, m.due), 0);
      m.score = { ...m.score, daysLeft, total: (m.score.stake * m.score.confidence) / (daysLeft + 1) };
    }
    const w = (m: Move) => (m.status === "open" ? 0 : m.status === "snoozed" ? 1 : 2);
    a.moves.sort((x, y) => w(x) - w(y) || y.score.total - x.score.total).forEach((m, i) => (m.rank = i + 1));
    a.answers.first = a.moves.filter((m) => m.status === "open").slice(0, 3).map((m, i) => `${i + 1}. ${m.title} (${m.owner}, by ${m.due})`).join(" · ");
  }
}

/* ---------- discovery: what the morning found, and how well the stories were tested ---------- */
function discoveryOf(a: RawAccount, deals: Deal[], docks: { status: string }[], prof: ReturnType<typeof profileOf>, S: Record<string, Source>, onFileNotMet: number): AccountView["discovery"] {
  const facts = a.facts
    .map((f) => ({
      id: f.id, text: f.text, saidBy: f.said_by, status: f.status, verifiedBy: f.verified_by ?? null, minute: f.learned_at_minute ?? null,
      unlocks: a.opportunities.filter((o) => o.evidence.includes(f.id)).map((o) => o.id),
    }))
    .sort((x, y) => (x.minute ?? 999) - (y.minute ?? 999));
  const active = docks.filter((d) => d.status === "active").length;
  const n = docks.length;
  const tested = a.facts.filter((f) => f.status === "claim").map((f) => {
    const base = { claimId: f.id, claim: f.text, saidBy: f.said_by };
    const r = (p: string) => `${a.id}:${p}`;
    if (f.id === "sr_roll_0") return { ...base, verdict: "contradicted" as const, finding: `Usage shows ${active} of ${n} docks flying at least weekly, not 13 of 15 plants.`, cite: [f.id, r("usage_weekly.csv")] };
    if (f.id === "rc_appetite_0") return { ...base, verdict: "contradicted" as const, finding: "Karen says only Westmere and Metro Central fly operationally; the flight log shows Tarn Valley with zero live flights since May and Norwold training only.", cite: [f.id, "rc_appetite_2", "flight_log_force_month"] };
    if (f.id === "sr_roi_0") return { ...base, verdict: "unsupported" as const, finding: "No workings were ever supplied, and the order form quotes no savings figure.", cite: [f.id, r("contract.txt"), r("emails/2026-07-16_stefan_savings.txt")] };
    if (f.id === "rc_funding_0") return { ...base, verdict: "unsupported" as const, finding: "No finance contact at the alliance or any force is on file; the invoice split (Schedule 2) is not held by customer success.", cite: [f.id, r("profile.json"), r("invoices.json")] };
    if (f.id === "rc_stadium_0") return { ...base, verdict: "unsupported" as const, finding: "Nothing in writing from Westmere or the alliance; no quote was issued.", cite: [f.id, r("deal_history.json"), r("internal_notes.json")] };
    return { ...base, verdict: "open" as const, finding: "Not yet tested against a file.", cite: [f.id] };
  });
  const minutes = facts.map((f) => f.minute).filter((m): m is number => m != null);
  const real = deals.filter((d) => d.kind !== "offer");
  return {
    facts,
    counts: {
      facts: facts.length,
      verified: facts.filter((f) => f.status === "verified").length,
      told: facts.filter((f) => f.status === "told").length,
      claim: facts.filter((f) => f.status === "claim").length,
      people: a.stakeholders.length,
      peopleOnFileNotMet: onFileNotMet,
      notOnFile: prof.not_on_file.length,
      files: Object.values(S).filter((s) => s.kind === "file" && (s.meta ?? "").includes(`Account ${a.id}`)).length,
      deals: a.opportunities.length,
      dealsWithEvidence: a.opportunities.filter((o) => o.evidence.length > 0).length,
      offersWon: a.offers.filter((o) => o.status === "won").length,
      offersDeclined: a.offers.filter((o) => o.status !== "won").length,
    },
    tested,
    files: Object.values(S).filter((s) => s.kind === "file" && (s.meta ?? "").includes(`Account ${a.id}`)).map((s) => ({ id: s.id, title: s.title })),
    coverage: real.map((d) => ({
      dealId: d.id, title: d.title,
      deciderMet: d.seats.some((s) => (s.role === "decides" || s.role === "signs") && s.met),
      payerMet: d.seats.some((s) => s.role === "pays" && s.met),
      evidence: d.evidence.length,
    })),
    firstMinute: minutes.length ? Math.min(...minutes) : null,
    lastMinute: minutes.length ? Math.max(...minutes) : null,
  };
}
