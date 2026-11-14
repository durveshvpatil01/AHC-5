// Draft writer: turns each ranked move into a message you could send on Monday.
// Deterministic templates filled only with facts already on file; every draft lists the ids it rests on.
import type { AccountView, Draft, Move } from "./types";

const money = (n: number | null | undefined, cur: string) =>
  n == null ? "n/a" : (cur === "GBP" ? "£" : cur === "EUR" ? "€" : "$") + Math.round(n).toLocaleString("en-GB");
const day = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

export function draftFor(m: Move, acc: AccountView): Draft {
  const k = acc.kpis;
  const sign = "\n\nBest regards,\n[Your name]\nCustomer Success, FlytBase";
  const idle = k.docks - k.active;
  const dropped = acc.fleet.filter((d) => d.flags.some((f) => f.startsWith("stopped") || f.startsWith("fell")));

  switch (m.id) {
    case "A-M-EVENT":
      return {
        channel: "email", to: "Insp. Karen Mbeki (Westmere drone unit)", subject: "5 December: operator training dates and cover on the day",
        body: `Dear Inspector Mbeki,

Thank you for your note about the public event on Saturday 5 December. Here are the two answers you asked for, in writing:

1. Operators: we can run additional operator training for your officers before the event. Proposed sessions: [date 1] and [date 2], led by Pranjal Suyal, our lead solutions engineer. Please send the names of the officers you would like trained.

2. Cover on the day: for 5 December you will have a named contact, [name, phone], on call for the whole operation, with a response within [X] minutes if a dock fails. This is part of the priority support you agreed with us.

I have logged this against your ticket FB-11206 so it has a number on our side too. I will call you on ${day(m.due)} to confirm.${sign}`,
        cite: ["urgent_request", "FB-11206", "a_training", "a_priority_support", "km_staff_2"],
      };
    case "A-M-SUCCESSOR":
      return {
        channel: "email", to: "Hannah Doyle (Alliance procurement lead), cc Rhys Calder", subject: "Renewal of the 35-dock order before 28 February: a short meeting",
        body: `Dear Hannah,

I have taken over the alliance account at FlytBase. The current order (35 docks, ${money(k.renewal.amount, acc.currency)} a year) ends on 28 February 2027 and does not renew automatically, so a new order is needed before then.

Before I prepare anything, I would like to walk you through how the docks are actually being used across the four forces: ${k.active} of ${k.docks} fly regularly today, and some sites have not started. I would rather we size the renewal on that picture than on assumptions.

Could we take 30 minutes in the next two weeks? Rhys has let us know he moves on in January, so I would also value your view on who should be involved on the alliance side from here.${sign}`,
        cite: ["a_renewal", "hannah_doyle", "A:contract.txt", "champion_leaves", "A:usage_weekly.csv"],
      };
    case "A-M-SCHEDULE2":
      return {
        channel: "internal", to: "FlytBase Accounts; field team (cc Achal Negi, Pranjal Suyal)", subject: "ECPA: Schedule 2 split and the install sheets, needed for the renewal",
        body: `Hi both,

For the Eastern Counties renewal (term ends 28 Feb 2027) I need two documents we hold internally but customer success never received:

1. Accounts: Schedule 2 of the order, i.e. how the ${money(k.renewal.amount, acc.currency)} is split across the four invoice parts (INV-26-0311 to 0314) and who each is billed to.
2. Field team: the install sheets showing which dock (ECPA-D01 to D35) sits at which force.

With both, I can show each force its own usage and cost. ${idle} of ${k.docks} docks are not flying weekly, and right now I cannot say whose they are. Could I have them by ${day(m.due)}?

Thanks`,
        cite: ["A:invoices.json", "A:internal_notes.json", "A:profile.json", "A:usage_weekly.csv"],
      };
    case "A-M-10412":
      return {
        channel: "internal", to: "FlytBase support desk", subject: "FB-10412: who is the requester? Open since 29 June",
        body: `Hi team,

Ticket FB-10412 (a document request from one of the forces) has been open since 29 June with no owner, and the requester has chased. Could you tell me who raised it and what document they need? I will own it from here.

I suspect it may be what Tarn Valley's sign-off has been waiting for: their 4 docks have shown "awaiting sign-off" with no live flights since May.

Thanks`,
        cite: ["FB-10412", "flight_log_force_month", "rc_appetite_2"],
      };
    case "A-M-TENDER":
      return {
        channel: "internal", to: "Yashash Rao (cc Achal Negi)", subject: "Costed operating model for the alliance's 300-dock tender spec",
        body: `Hi Yashash,

The alliance's tender spec for up to 300 docks has no costed operating model, and nobody has agreed who would fly them. That is our opening.

Inputs we have: Westmere flies 14 of 18 docks with six part-time officers, mostly on overtime. Their estimate is that 30 docks need nine more trained operators plus shift cover. Two missing-person finds took under 12 minutes against roughly 40 for the helicopter (an anecdote, not costed yet).

Could you draft a one-page operating model (operators per dock, shifts, cost per flight) by ${day(m.due)} that I can offer to Hannah Doyle as input to the spec?`,
        cite: ["rc_tender_2", "km_staff_2", "km_value_2", "km_usage_1"],
      };
    case "B-M-DROP":
      return {
        channel: "email", to: "Plant managers for the affected docks (via Stefan Roy)", subject: `Night patrols paused on ${dropped.map((d) => d.dockId).join(", ")}: anything we can fix?`,
        body: `Dear Stefan,

Our usage data shows that ${dropped.map((d) => d.dockId).join(", ")}, which flew most nights through October, have not flown at all in the last two weeks, although they stayed online. No ticket has been raised.

Was this a deliberate change (a schedule switched off, an operator away, too many alerts)? If something is getting in the way, we would like to fix it this week. Could you put me in touch with the plant managers concerned?${sign}`,
        cite: ["usage_drop", ...dropped.map((d) => d.dockId), "B:usage_weekly.csv"],
      };
    case "B-M-FINANCE":
      return {
        channel: "email", to: "Group Finance (shared mailbox), Aldermoor", subject: "Renewal quote by plant, as requested on 8 October",
        body: `Hello,

Apologies that your note of 8 October went unanswered during a change of account manager on our side. You asked for the renewal quote split by plant.

The current order is ${money(k.renewal.amount, acc.currency)} a year for 14 docks (${money((k.renewal.amount ?? 0) / Math.max(k.docks, 1), acc.currency)} per dock) and ends on 31 January 2027. I will send the quote per plant together with how often each dock has flown, so that each plant can see what it gets for its share.

Two questions so I get it right: who will sign the renewal on the group side, and is there a named person in finance I should work with?${sign}`,
        cite: ["B:emails/2026-10-08_finance_mailbox.txt", "B:contract.txt", "B:usage_weekly.csv", "B:requests.csv"],
      };
    case "B-M-DEPUTY":
      return {
        channel: "email", to: "Stefan Roy, Group head of security", subject: "Writing down the rollout before your deputy moves on",
        body: `Dear Stefan,

Your deputy set up most of the plant docks and knows how a rollout is really done, and I understand he leaves soon. Before he goes, could we have a 60-minute working session with him to write down:
- the install list (which dock is at which plant),
- one named owner per plant,
- the patrol schedule each plant runs.

This is what will let the idle plants get going and make the case study credible for your sister company. Would ${day(m.due)} work?${sign}`,
        cite: ["sr_repl_2", "ba_deputy_0", "B:calls/2026-04-23_rollout_close.txt"],
      };
    case "B-M-PLANT11":
      return {
        channel: "internal", to: "Pranjal Suyal (cc support desk)", subject: "FB-10903 Plant 11 link: pending the customer since September",
        body: `Hi Pranjal,

FB-10903 (the Plant 11 dock goes offline for days) has been waiting on the customer's IT since 10 September. Device events show repeated connection drops. I am asking Stefan for a named IT contact; could you be ready to work the link with them once I have it?`,
        cite: ["FB-10903", "B:device_events.csv"],
      };
    case "B-M-SAVINGS":
      return {
        channel: "email", to: "Stefan Roy", subject: "Case study for the sister company: building it on numbers that hold up",
        body: `Dear Stefan,

I would like to get your case study moving. To make it stand up in front of a 40-plant company, I suggest we build it on what the docks have measurably done (patrols flown, incidents found) at your busiest plants, signed off by a plant manager.

Could you share how the €1.2 million a year saving was worked out? If the workings hold up, it becomes the headline. If not, the measured results carry it on their own.${sign}`,
        cite: ["sr_roi_0", "B:contract.txt", "B:emails/2026-09-22_stefan_case_study.txt"],
      };
  }
  // Generic: a reply to a live event or a first move on a new account.
  const sig = acc.signals.find((s) => m.cite.includes(s.id));
  return {
    channel: sig ? "email" : "internal",
    to: sig ? "The contact named in the event" : "Achal Negi, Neel Sharma",
    subject: sig ? `Re: ${sig.title.replace(/^[^:]+:\s*/, "")}` : m.title,
    body: sig
      ? `Hello,

Thank you for letting us know. ${sig.summary}

I own this on the FlytBase side. I will come back with a concrete answer by ${day(m.due)}. If anything changes before then, please call me directly.${sign}`
      : `${m.detail}\n\nOwner: ${m.owner}. Due: ${day(m.due)}.`,
    cite: m.cite,
  };
}

export function attachDrafts(accounts: AccountView[]) {
  for (const a of accounts) for (const m of a.moves) m.draft = draftFor(m, a);
}
