# Account Desk — Thinking Doc

## 1. What It Does and For Whom
**Account Desk** is a live Customer Success CRM built for a FlytBase CS Manager opening their desk on Monday at 9:00 AM. It covers two enterprise accounts—**Account A (Eastern Counties Police Alliance, GBP)** and **Account B (Aldermoor Industrial Group, EUR)**—and answers the five questions that determine whether a renewal closes cleanly:
1. **What is the book worth?** Separates contract-backed value from unverified claims and verbal estimates (`backed` vs `told` vs `claim`).
2. **Who holds the power?** Maps every deal's buying committee (`decides`, `pays`, `signs`, `uses`, `could block`, `champions`), their stance, and any `UNKNOWN` unmet seats.
3. **What do we do first?** Ranks concrete next moves with an owner, due date, deal impacted, and one-click write-back (`write_note`) to the game.
4. **What is about to go wrong?** Surfaces red/amber risks sorted by severity and when each turns bad.
5. **What do we still not know?** Lists the blind spots the plan rests on and who can answer each one.

Every number, status, and claim on screen carries a clickable `<Cite>` chip that opens the raw MCP source record (`contract.txt`, `usage_weekly.csv`, call transcripts, tickets, or live signals).

---

## 2. How It Decides (Rules & Scoring in `src/lib/engine.ts`)

### Health Score (0–100)
`health = 0.50 × usage + 0.25 × relationships + 0.25 × support`
- **Usage (50%)**: percentage of installed docks that flew ≥ 4 times in the last 4 weeks (`active / total docks × 100`).
- **Relationships (25%)**: average stance score across met stakeholders (`guarded = 25`, `neutral = 50`, `warm = 75`, `ally = 100`).
- **Support (25%)**: starts at 100 and subtracts 25 points for each open, unowned support/document request.

### Move Ranking (`R-MOVE`)
Every candidate action is scored by:
`score = (stake × confidence) ÷ (daysLeft + 1)`
- **Stake**: the contract or at-risk dock value in the account's native currency (no cross-currency summing).
- **Confidence**: probability that the move unblocks or protects the stake (0.20–0.90).
- **Urgency (`daysLeft + 1`)**: days remaining until the hard deadline or due date.

### Risk & Gap Rules (`R-xx`)
- **`R-USAGE`**: Fires when ≥ 15% of docks had zero flights in the last 4 weeks (**red** if ≥ 25%). Turns bad 90 days before term end.
- **`R-DROP`**: **Red** risk when a previously busy dock (≥ 3 flights/week) stops flying for 2 weeks or drops to ≤ 25% of its prior 4-week volume.
- **`R-OPEN`**: Flags open requests with no owner (**red** if marked urgent or open > 30 days).
- **`R-THREAD`**: Flags single-threaded accounts (**red** if the sole contact is leaving before renewal; **amber** if one contact attended every call).
- **`R-COLD`**: **Amber** risk when a met stakeholder on a live deal has a `guarded` stance.
- **`R-DEADLINE`**: **Amber** risk for any active game deadline that has not passed yet but lacks an exact date on file.
- **`R-RENEWAL`**: Fires when < 120 days remain to term end and the renewal deal is not yet qualified (**red** if < 75 days).
- **`R-CLAIM`**: **Amber** risk when the official account story rests on an unverified `claim` fact.
- **`R-CONN`**: **Amber** risk when a dock logs ≥ 10 connection drops in 8 weeks.
- **`R-BATT`**: **Amber** risk when a dock logs ≥ 5 battery health warnings.
- **`R-GAP-*`**: Surfaces blind spots from missing profile records (`R-GAP-FILE`), unverified claims (`R-GAP-CLAIM`), unqualified deals without worth (`R-GAP-WORTH`), undated deadlines (`R-GAP-DATE`), and correlated open items (`R-GAP-LINK`, e.g., `FB-10412` and Tarn Valley).

---

## 3. What It Does Not Do Yet
- **No cross-account currency conversion**: GBP and EUR books are intentionally kept separate rather than rolled into a synthetic total.
- **No automated outbound messaging**: Drafts and next steps are written back to the game via `write_note`, not sent directly to customer email/Slack.
- **Polling instead of push**: Uses a 30-second `/api/live` fingerprint check backed by staggered server caches (`60s` signals, `300s` notes, `420s` export) to respect the 1-call/minute token limit.
- **No automatic claim verification**: Unbacked claims remain quarantined until a human attaches a file or confirms with the named owner.

---

## 4. How AI Was Used
- **Claude Code**: Built the MCP snapshot ingestion, server-side caching (`src/lib/aq.ts`), API routes (`/api/live`, `/api/notes`), and deterministic rule engine (`src/lib/engine.ts`).
- **Antigravity**: Designed and polished the FlytBase-inspired dark console UI (`src/components/*`, `src/app/globals.css`), including the 5-question hero strip, per-deal power map, fleet SVG chart, risk radar, and citation drawer.
- **Human (Durvesh)**: Conducted the morning discovery in Account Quest, validated edge cases, verified live write-back, and owns the Monday 9am CS judgement calls.
