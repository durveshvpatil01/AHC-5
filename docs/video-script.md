# Account Desk — 3-Minute Walkthrough Video Script (3:00)

## 0:00 – 0:20 · Cockpit (Live Operations View)
- **Action:** Start in **Cockpit** mode (press `x` or click `Cockpit` in the top bar).
- **Show:** Full-screen live gauges for Eastern Counties (health 47, £350,000 GBP) and Aldermoor (health 33, €140,000 EUR), renewal countdowns, moves on the clock, red risks, and the live MCP feed ticking every 61s.
- **Say:** "This is Account Desk—a live Monday 9am Customer Success console for FlytBase with its own MCP scheduler. In Cockpit mode we see both renewals, fleet utilisation, urgent deadlines, and live MCP pulls at a glance."

## 0:20 – 0:40 · Portfolio (Monday 9am View)
- **Action:** Press `Esc` (or click **Portfolio**).
- **Show:** The two account cards in their native currencies (never summed across GBP and EUR), the fleet stacked bars, **"Sheet says vs Data says"**, the ranked **This week** action queue, and **Live events**.
- **Say:** "On Portfolio, we contrast the unverified handover sheet with what the data actually proves, and rank this week's first moves across both accounts by `stake × confidence ÷ (days left + 1)`."

## 0:40 – 1:15 · Eastern Counties: The Five Answers
- **Action:** Click **Eastern Counties (Account A)**. Click through the **Q1–Q5 hero strip**:
  - **1 · Book:** £350,000 renewal backed by `contract.txt`; unverified claims (like Rhys's 30-dock stadium figure) sit quarantined apart.
  - **2 · Power:** Buying committee per deal—Karen Mbeki (`ally`), Hannah Doyle (`neutral`), Rhys Calder (leaving), and red dashed `UNKNOWN` seats for unmet force leads and payers.
  - **3 · First moves:** #1 Reply to Karen in writing before the 5 Dec event (`FB-11206`, delivering won offers `a_training` and `a_priority_support`), with one-click **Draft** and **Save to game** (`write_note`).
  - **4 · About to go wrong:** Red risks at the top with exact `R-xx` rules and "turns bad" dates.
  - **5 · Unknowns:** Gaps like `FB-10412` and operator-to-force mapping (`A:users.json`), plus who can answer each.

## 1:15 – 1:35 · Trace £180,000 to Its Source (`<Cite>` Drawer)
- **Action:** Click the **`A:contract.txt`** chip on the £350,000 renewal (or open `R-USAGE` / **Fleet** tab and click **`A:usage_weekly.csv`**).
- **Show:** The Source Drawer sliding open with the raw contract text (£350,000 across 35 docks = £10,000/dock), then switch to the **Fleet** tab showing 18 docks not flying weekly (10 stopped + 7 never flown + 1 low = £180,000 of renewal value at risk) and the 12-week flight chart.
- **Say:** "Every number is backed by a clickable citation. `A:contract.txt` proves £350,000 for 35 docks—£10,000 per dock—and `usage_weekly.csv` in Fleet shows 17/35 active while 18 docks fly less than weekly, putting £180,000 of the renewal at risk."

## 1:35 – 2:00 · Account Plan: Tarn Valley Unlock Chain + Print Plan for Neel
- **Action:** Click **Account plan** in the left rail (key `a`).
- **Show:** The handover story ("then → morning → now"), force-by-force cards from `flight_log_force_month`, and the **Tarn Valley unlock chain** (`deliver FB-10412 doc → meet lead → fly 4 docks → prove value → ask about stadium`), where "fly live missions" is automatically marked `blocked` until `FB-10412` is closed. Click **Print plan for Neel**.
- **Say:** "Account Plan turns findings into causal unlock chains: delivering the `FB-10412` data-protection doc unlocks Tarn Valley's 4 idle docks (£40,000 backed) before we ever pitch expansion. And one click prints the 2-week, quarter, and 12-month plan for Neel."

## 2:00 – 2:15 · Notebook Journal + Discovery "Claims Tested"
- **Action:** Click **Notebook** (key `n`), then **Discovery** (key `d`).
- **Show:** Notebook's game-stage deals and chronological morning journal; then Discovery's **Claims tested** table showing official stories and champion claims (`rc_appetite_0`, `sr_roll_0`, `sr_roi_0`) contradicted by usage and contract files.
- **Say:** "Notebook mirrors our morning in the game, and Discovery audits every claim against the raw files—showing where usage data contradicts the official story, plus Playbook guards that warn 'Don't pitch yet' on idle fleets."

## 2:15 – 2:35 · Change Log & MCP Panel: Live Event with `Δ` Lines
- **Action:** Click **Change log** (key `l`) and open the **MCP live** panel in the header (key `m`).
- **Show:** The portal's own JSON-RPC scheduler (1 call/min, most-overdue source first) and the live event entries (`champion_leaves`, `urgent_request`, `usage_drop`) with before/after **`Δ` lines** showing how each signal merged into paperwork, added a red risk, and re-ranked moves.
- **Say:** "The portal runs its own 1-call-per-minute MCP scheduler. When a live signal lands, Change Log records the exact before-and-after deltas—merging new rows, firing `R-DROP` or `R-CHAMP`, and re-ranking the queue automatically."

## 2:35 – 2:50 · AI Copilot: Question with Cited Answer
- **Action:** Click **AI Copilot** (key `c`) and click or ask: *"What should I do first on Monday, and why?"*
- **Show:** Claude Opus 5.5 streaming a response where every fact, deal, and rule renders as a verified clickable `[id]` citation chip.
- **Say:** "The AI Copilot runs Claude Opus 5.5 over the live CRM state, and every citation chip in its answer is verified against `crm.sources`."

## 2:50 – 3:00 · The Code: `sync.ts`, `engine.ts`, and Tests
- **Action:** Briefly flash VS Code showing `src/lib/sync.ts`, `src/lib/engine.ts`, and the terminal running `npx vitest run` (24/24 passing).
- **Say:** "Under the hood: `sync.ts` manages the 1-call/min MCP connection with snapshot fallback, `engine.ts` runs deterministic `R-xx` rules with zero unbacked numbers, `AQ_TOKEN` stays strictly server-side, and 24 Vitest assertions verify every rule and citation."
