# Account Desk: a live CS CRM for two FlytBase accounts

A Monday-morning CRM for the two accounts from **Account Quest** (FlytBase × AI Hackers Collective).
For each account it answers five questions, and **every number is cited** with the id it comes from (click any `▤ id` chip to read the record):

1. **What is the book worth?** Deals split into *backed* (contract, invoices, usage data), *told* and *claim*. Unbacked value is shown apart and is never totalled.
2. **Who holds the power?** For every deal: who decides, pays, signs, uses, could block and champions it, with each person's stance. Seats held by people nobody has met show as **UNKNOWN**.
3. **What do we do first?** Ranked moves, each with an owner, a due date, the deal it moves and its evidence. One click writes a move back to the game (`write_note`).
4. **What is about to go wrong?** A risk radar (red/amber) with the date each risk turns bad.
5. **What do we still not know?** The gaps the plan rests on, why each matters, and who can fill it.

It also has a **fleet health** view per dock, computed from weekly usage, flights and device events, and a searchable **timeline** of calls, emails, tickets and live events.

## It stays live
- `get_signals` is re-read every 60 s, the export every 7 min and the notes every 5 min (Vercel Data Cache), which keeps the token under its **1 call a minute** limit.
- Live events are not just listed: their records are **merged into the paperwork**. New usage rows change the fleet numbers, and a new ticket becomes a risk and a move. The browser polls `/api/live` every 30 s and re-renders when anything changes, so no reload is needed.
- Notes go back to the game through `/api/notes` → `write_note`.
- If the API is rate-limited or down, the page falls back to the committed snapshot in `data/snapshot/`, which was fetched once with `scripts/snapshot-rest.mjs`.

## How it decides (rules)
Every rule is pure code in `src/lib/engine.ts`, and each rule's id is shown next to what it produced:
- **Book:** a value is *backed* only when a contract, invoice or usage file supports it. The value per dock is derived as `annual value ÷ docks` from the contract. Claims (`status: claim`) never count toward a total.
- **R-USAGE / R-DROP:** docks with zero flights in 4 weeks; busy docks (≥ 3/week) that went silent for 2 weeks.
- **R-OPEN:** an open request with no owner (red if marked urgent or older than 30 days).
- **R-THREAD / R-CHAMP:** a single-threaded account; the only contact leaving before the renewal.
- **R-RENEWAL:** fewer than 120 days to term end and the deal is still not qualified.
- **R-CLAIM, R-COLD, R-CONN, R-BATT, R-DEADLINE:** see the code.
- **Moves:** `score = stake × confidence ÷ (days left + 1)`. The stake is the renewal value the move protects, in the contract's currency.
- **Health:** 50% usage (share of docks active), 25% relationships (average stance), 25% support (−25 for each unowned open request).

## Run it
```bash
npm install
cp .env.example .env.local   # put your AQ_TOKEN in it (never commit it)
node scripts/snapshot-rest.mjs   # optional: refresh the snapshot (one call a minute)
npm run dev
```
Deploy: import the repo in Vercel and set the `AQ_TOKEN` environment variable. The token only ever lives on the server.

## Layout
`src/lib/aq.ts` (MCP/REST access + cache) · `src/lib/model.ts` (merge, fleet analytics, sources) · `src/lib/engine.ts` (the five answers) · `src/components/*` (UI) · `memory/` (shared notes for the AI agents that built it).
