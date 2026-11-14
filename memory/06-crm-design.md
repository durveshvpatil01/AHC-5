# 06: CRM design (from the host's talk, Durvesh's notes and CS-platform practice)

## What the host said (transcribed by Durvesh, 14 Nov afternoon)
- The MCP gives the game data plus the account **history**: raw records, call transcripts, **usage data** (how much each dock flew over the past ~6 months), contracts, tickets, devices, logins and invoices.
- As a CS person you need: the **book of business**, **project status / current status**, **how many docks**, **deal value**, **how many are damaged / down**. Map the data out, then run **analytics that turn it into priorities: a to-do list** (money first).
- Like the CS platforms shown in the morning: **different buckets**, kept up to date. **NOT a data dump: clean and actionable.**
- Research how CRMs are built and why (structure: account → contacts → opportunities → activities → tasks).
- Be able to **explain every number** (judges may ask live).
- Reference look: the FlytBase onboarding checklist (dark console: overall % + progress bars + tabs with counts + status pills + per-row docs/feedback) and FlytBase Media Guard (left nav, filter chips, grid).

## CRM structure (how CS platforms like Gainsight, Vitally and ChurnZero lay it out, adapted)
Top bar: **Portfolio** (both accounts) | Account A | Account B. Live-sync pill (last get_signals time, new-event badge).

### Portfolio home (Monday 9am view)
- KPI strip: Book backed $ / Book told $ / Unbacked $ · Docks installed / flying / idle / down · Open risks · Renewals due (days)
- **Action queue**: the top moves across both accounts, ranked (score = $ × chance × urgency), each with an owner, a due date, the deal it moves and cite chips. "Write to game" button → write_note(next_step).
- **Live events feed** (get_signals), each marked with what it changes (risk added / move re-ranked).

### Account page: five tabs, with counts in the tab labels (like the onboarding checklist)
1. **Book**: a deals table. Stage pill (identified/qualified/cleared/agreed), value split into backed / told / claim, the source id under each value, the renewal date. Totals by column. "What we can't back" sits in its own box.
2. **Power**: per deal, the decider / payer / user / blocker / champion with a stance pill (guarded/neutral/warm/ally) or **UNKNOWN** (red). Unmet people in grey, with "who can introduce".
3. **First moves**: the ranked top 3 (then the rest), each with an owner (Durvesh / a named FlytBase colleague), a date (before the deadline), the deal moved and evidence ids.
4. **Risks**: a radar list (red/amber/green): deadlines at risk, cold or leaving people, stuck deals, usage drops, unanswered tickets, each with "turns bad on <date>".
5. **Unknowns**: the gaps the plan rests on, why each matters, and who could fill it.
Plus a **Fleet / health** strip on the account page: docks per site or force, live vs idle vs down (usage data), trend sparkline, and tickets. Health score = usage % × sentiment × support load (each part shown).
Plus **Timeline**: calls, emails and tickets, newest first (paperwork), searchable. A citation chip opens the record.

## Rules for clean, not a dump
- Each panel answers one question in one sentence at the top (e.g. "$X backed of $Y. 2 deals rest on a claim.").
- Show at most the top 3 by default; "show all" expands.
- Every number has a cite chip `[id]`. Click it → a drawer with the raw record (file, call, fact).
- Colour only means something: red = act now, amber = soon, green = OK, grey = unknown.
