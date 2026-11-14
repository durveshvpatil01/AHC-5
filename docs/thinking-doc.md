# Account Desk: Thinking doc
*Durvesh Patil · Account Quest build · one page*

## What it does, and for whom
**For:** the CSM who inherits Eastern Counties Police Alliance (A) and Aldermoor Industrial Group (B) on a Monday, and the manager they report to.
**What:** a live CRM that answers five questions per account, citing the id behind every number:
1. **Book:** what each deal is worth *and what backs it*. The renewals (£350,000 for A, €140,000 for B) are backed by the contract. "Claims" (the 300-dock tender, the 30-dock stadium, the €1.2M saving) are shown apart and never totalled.
2. **Power:** for each deal, who decides, pays, signs, uses, could block and champions it, with their stance. Seats held by people nobody has met are marked **UNKNOWN**: on A, 9 seats; on B, 7.
3. **First moves:** ranked, each with an owner, a due date inside its deadline, the deal it moves and its evidence. One click saves a move into the game (`write_note`).
4. **About to go wrong:** a red/amber radar with the date each risk turns bad.
5. **Still unknown:** the gaps the plan rests on, and who can fill each one.

It also covers **fleet health** (each dock: active, low, stopped or never flown, from usage, flights and device events) and a **timeline** of every call, email, ticket and live event.

## How it decides: the rules (all in `src/lib/engine.ts`, each tagged on screen)
- **Backed vs claim:** a value counts only if a contract, invoice or usage file supports it. Value per dock = annual value ÷ docks (contract). A fact with `status: claim` never enters a total; it becomes a gap to verify.
- **Fleet:** *active* = ≥ 4 flights in 4 weeks; *low* = 1-3; *stopped* = 0 now but flew before; *never*. **R-DROP:** a busy dock (≥ 3/week) silent for 2 weeks.
- **Risks:** R-USAGE (≥ 15% of docks idle; red ≥ 25%) · R-OPEN (an open request with no owner; red if urgent or older than 30 days) · R-THREAD/R-CHAMP (single-threaded; the only contact leaving) · R-RENEWAL (< 120 days to term end, not qualified) · R-CLAIM · R-COLD · R-CONN · R-BATT · R-DEADLINE.
- **Moves:** `score = stake × confidence ÷ (days left + 1)`. The stake is the renewal value the move protects. Urgency dominates, so a reply due tomorrow beats a bigger move due next week.
- **Health:** 50% usage + 25% relationships (guarded 25 → ally 100) + 25% support (−25 for each unowned open request). Every part is shown.
- **Live:** live events (`get_signals`) are **merged into the paperwork**: new usage rows change the fleet, and a new ticket becomes a risk and a move. The browser checks every 30 s and re-renders on change. Server caches are staggered (signals 60 s, export 7 min, notes 5 min) to stay under one call a minute. If a call fails, the page falls back to the stored snapshot.

## What it found (Monday 9am)
- **A:** 17 of 35 docks active; 7 have never flown; Tarn Valley has flown nothing since May ("awaiting sign-off"), and an unanswered document request (FB-10412) has been open since June. Rhys, the only contact, leaves in January. **First move:** reply to Karen, the account's only ally, in writing before her 5 Dec event (FB-11206). That also delivers the two offers won in the morning.
- **B:** 4 of 14 docks active, against "13 of 15 plants flying". AD-02, AD-05 and AD-10 stopped two weeks ago while still online. Finance asked for cost per plant in October and nobody replied. **First move:** find out why the busiest docks stopped, before finance sees a per-plant quote.

## What it does not do yet
- No dock-to-site map: the install sheets aren't in the data, so idle docks can't be named by force or plant (this is listed as a gap, with who holds the sheets).
- The power-map seats and move templates are written as rules over named records, not learned. A brand-new kind of event gets a generic risk and timeline entry, but no tailored move.
- No currency conversion: GBP and EUR are never summed.
- No auth, so it's single-user, and no history of how the scores changed over time.

## How I used AI
- **Claude Code** (desktop): it read the build brief and the data schema, pulled the data under the rate limit, wrote the analytics and rules engine, built the UI, and checked that every cited id exists (`scripts/engine-check.ts`). **Antigravity** worked in parallel on the doc and script. A shared `memory/` folder kept both agents and fresh chats in sync.
- I made the calls: what counts as "backed", the thresholds, what a good first move is, and how it reads to a manager. I questioned every number the AI put on screen until I could trace it to a record.
