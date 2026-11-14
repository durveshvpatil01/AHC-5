// AI Copilot grounding: turns the live CRM view into a compact, cited context for Claude.
// The model may only cite ids that exist in `sources`; the browser re-checks every cited id.
import "server-only";
import type { CrmView } from "./types";

export const COPILOT_MODEL = "claude-opus-5-5";

export const COPILOT_RULES = `You are the Copilot inside Account Desk, the customer-success CRM a FlytBase CSM uses for two accounts: A (Eastern Counties Police Alliance, GBP) and B (Aldermoor Industrial Group, EUR).

Answer only from the CRM DATA and SOURCES in the next block. They are pulled live from the Account Quest MCP and already scored by the CRM's rules engine.

Rules:
- Cite every fact, number, date and person with its source id in square brackets, exactly as it appears in SOURCES, e.g. [A:contract.txt], [km_staff_2], [FB-11206], [ECPA-D09]. Put the citation right after the claim it supports.
- Use only ids that appear in SOURCES. Never invent an id, a person, a number or a date.
- Say how sure a fact is when it matters: "claim" (may be wrong), "told" (a person said it) or "verified" (backed by a file).
- If the data does not answer the question, say so plainly, then say what is missing and who could tell us (use the gaps).
- Keep money in each account's own currency and never add GBP and EUR together.
- Be brief and practical, like a senior CSM briefing a colleague: lead with the answer in one or two sentences, then at most five short bullets. Use **bold** sparingly. No headings.
- For plans, use the account plan's plays (unlock chains: deliver -> person -> usage -> proof -> money -> expansion) and horizons; respect the lessons and guards (e.g. do not recommend expansion while docks are idle or a blocker is open).
- When asked to draft a message, write it ready to send, and fill blanks only with facts from SOURCES; leave [brackets-in-caps] like [DATE] for anything not on file.`;

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + " …" : s);

export function buildContext(crm: CrmView): string {
  const accounts = crm.accounts.map((a) => ({
    id: a.id,
    name: a.name,
    sector: a.sector,
    currency: a.currency,
    official_story_unverified: a.officialStory,
    data_story: a.dataStory,
    five_answers: a.answers,
    kpis: {
      renewal: a.kpis.renewal,
      term_ends: a.kpis.termEnds,
      days_to_renewal: a.kpis.daysToRenewal,
      docks: a.kpis.docks, active: a.kpis.active, low: a.kpis.low, stopped: a.kpis.dormant, never_flown: a.kpis.never,
      flights_last_4_weeks: a.kpis.flightsLast4, flights_previous_4_weeks: a.kpis.flightsPrev4,
      health: a.kpis.health,
    },
    deals: a.deals.map((d) => ({ id: d.id, title: d.title, stage: d.stage, value: d.value, blocker: d.blocker, blocker_cite: d.blockerCite, next: d.next, deadline: d.deadline, deadline_text: d.deadlineText, power: d.seats.map((s) => ({ role: s.role, who: s.name, stance: s.stance, met: s.met, note: s.note, cite: s.cite })) })),
    people: a.people.map((p) => ({ id: p.id, name: p.name, role: p.role, stance: p.stance, met: p.met, last_contact: p.lastContact, note: p.note })),
    first_moves: a.moves.map((m) => ({ rank: m.rank, id: m.id, title: m.title, owner: m.owner, due: m.due, status: m.status, deals: m.dealIds, why: m.why, cite: m.cite })),
    risks: a.risks.map((r) => ({ level: r.level, title: r.title, detail: r.detail, turns_bad_on: r.turnsBadOn, rule: r.rule, cite: r.cite })),
    gaps: a.gaps.map((g) => ({ question: g.question, why: g.why, who_can_tell: g.whoCanTell, cite: g.cite })),
    docks_needing_attention: a.fleet.filter((d) => d.status !== "active" || d.flags.length).map((d) => ({ id: d.dockId, status: d.status, last4: d.last4, prev4: d.prev4, total: d.total, last_flight: d.lastFlight, flags: d.flags })),
    live_events: a.signals.map((s) => ({ id: s.id, dated: s.dated, title: s.title, summary: s.summary, impact: s.impact })),
    account_plan: {
      headline: a.plan.headline,
      plays: a.plan.chains.map((c) => ({ id: c.id, title: c.title, why: c.why, unlocks: c.unlocks, upside: c.upside, value: c.value, steps: c.steps.map((st) => ({ id: st.id, kind: st.kind, label: st.label, status: st.status, owner: st.owner, due: st.due })) })),
      segments: a.plan.segments.map((g) => ({ name: g.name, state: g.state, docks: g.docks, live: g.live, missions: g.missions, know: g.know, give: g.give, build: g.build })),
      horizons: a.plan.plan.map((x) => ({ horizon: x.horizon, step: x.stepId, title: x.title, owner: x.owner, due: x.due, status: x.status })),
    },
    lessons: a.lessons.lessons.map((l) => ({ id: l.id, kind: l.kind, title: l.title, rule: l.rule })),
    guards: a.lessons.guards,
  }));
  const sources = Object.values(crm.sources)
    .map((s) => `### [${s.id}] (${s.kind}) ${s.title}\n${s.meta ? s.meta + "\n" : ""}${clip(s.text, 2400)}`)
    .join("\n\n");
  return `Account-world date: ${crm.asOf}. Notes written back to the game: ${crm.notes.length}.

CRM DATA (computed by the rules engine; every value carries the ids it rests on):
${JSON.stringify({ accounts, team: crm.team }, null, 0)}

SOURCES (the only ids you may cite):
${sources}`;
}
