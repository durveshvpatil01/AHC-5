# Account Desk — 3-Minute Walkthrough Video Script

**Target length:** ~3:00 (180 seconds)  
**Setup:** Open the deployed live CRM in a private/incognito window on the **Portfolio** view.

---

## 0:00 – 0:30 · Hook & Portfolio Overview (30s)
- **Show:** Portfolio page (`Account Desk · FlytBase CS`).
- **Say:**  
  "This is **Account Desk**—a live Monday 9am Customer Success CRM for FlytBase, built on the Account Quest MCP. Right on the Portfolio view we see both accounts in their native currencies—**Eastern Counties Police Alliance (Account A, GBP, health 47)** and **Aldermoor Industrial Group (Account B, EUR, health 33)**—alongside what the unverified account sheet says versus what the usage data actually shows, our top moves for the week, and the live events feed."

---

## 0:30 – 1:35 · The Five Answers for Account A (65s)
- **Click:** Account A (`Eastern Counties`).
- **Show:** The 5-question hero strip (Q1–Q5) at the top.
- **Say & Click through:**
  1. **Q1 — Book (`1 · Book`):** "What is the book worth? **£350,000** renewal is backed by the contract, but **18 of 35 docks** fly less than weekly—so half the renewal pays for idle kit. Unbacked claims and verbal estimates are quarantined in their own panel, never mixed into the backed total."
  2. **Q2 — Power (`2 · Power`):** "Who holds the power? Per deal, we map who decides, pays, signs, uses, champions, or could block. **Karen Mbeki** is our ally, **Hannah Doyle** is procurement (neutral), **Rhys Calder** is leaving, and **red dashed boxes** immediately expose `UNKNOWN` decision seats we haven't met."
  3. **Q3 — First moves (`3 · First moves`):** "What do we do first? Moves are ranked by `stake × confidence ÷ (days left + 1)`, each with an owner, due date, and the deal it unlocks."
  4. **Q4 — Risks (`4 · About to go wrong`):** "Risk radar sorted red to amber, each showing the exact rule and the date it turns bad."
  5. **Q5 — Unknowns (`5 · Unknowns`):** "Every blind spot the plan rests on—like `FB-10412` and Tarn Valley—and who can tell us."
  - *(Optional 5s glance at `Fleet` tab)*: "And in Fleet, we see the 12-week flight trend SVG and per-dock sparklines with flagged docks highlighted."

---

## 1:35 – 2:05 · Tracing One Number to Its Source (30s)
- **Click:** On Account A's header or `1 · Book`, click the **`contract.txt`** `<Cite>` chip next to **£350,000** (or click `usage_weekly.csv` next to the idle docks).
- **Show:** The slide-over Source Drawer opening with the raw file text and exact MCP id.
- **Say:**  
  "Every single number on screen carries its source id. Clicking `contract.txt` opens the raw contract record directly from the MCP data—proving the £350,000 annual value and the 28 Feb 2027 end date. Nothing is invented or unbacked."

---

## 2:05 – 2:35 · Live Event + Write-Back to the Game (30s)
- **Show:** The **Live** pill in the top-right header (`polling every 30s`) and the **Live events** feed (e.g., `urgent_request` / `FB-11206` on Account A, or `usage_drop` on Account B).
- **Say:**  
  "The CRM stays live. When `get_signals` delivers a new event—like Karen's urgent request `FB-11206` for the 5 December event—it merges straight into the paperwork, flags a new red risk, and re-ranks **Reply to Karen** to Move #1.  
  And we write back to the game: clicking **Save to game** on a move posts a `next_step` note via `/api/notes` (`write_note`), keeping the game state in sync."

---

## 2:35 – 3:00 · The Code, Briefly (25s)
- **Show:** Briefly switch to VS Code / editor or mention the 3 key files:
  - `src/lib/engine.ts` — deterministic `R-xx` rules, health formula (`0.5 usage + 0.25 relationships + 0.25 support`), and `R-MOVE` scoring.
  - `src/lib/aq.ts` — server-only MCP client using `unstable_cache` with staggered revalidation (`60s` signals, `300s` notes, `420s` export) and committed `data/snapshot` fallback to stay under the 1-call/minute limit.
  - `AQ_TOKEN` lives strictly in `.env.local` / Vercel env vars—never in browser code or the public repo.
- **Say:** "Clean, cited, and live—ready for Monday 9am."
