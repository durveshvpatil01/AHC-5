# 07: Prompt for Antigravity: finish the remaining development (14 Nov, ~15:45 IST)

> Paste everything below the line into Antigravity, with `D:\flaybase-hackarthon-4\aq-crm` open as the workspace.

---

You are continuing a hackathon project: **Account Desk**, a live customer-success CRM for two FlytBase accounts from the "Account Quest" game. **The hard deadline is about 16:45-17:00 IST today** (hand-in 15:47 + 1 h extension). Work in small, safe, tested steps and commit after each task. If time runs short, stop and leave the app working: a working app beats an unfinished feature.

## 0. Read first (5 minutes, no skipping)
1. `memory/host-info.md`: what the judges want (the five questions, the judging rows, the host's instructions, including the Hindi brief about plans, unlocks and lessons).
2. `memory/08-session-history.md`: what is built and why; decisions not to reopen.
3. `memory/09-puzzle-pieces.md`: findings in the raw data that are not yet in the CRM (task T3).
4. `memory/03-architecture.md` + `README.md`: architecture.

Key files: `src/lib/sync.ts` (the portal's MCP connection and scheduler), `src/lib/load.ts` (builds the CRM from the sync store), `src/lib/engine.ts` (rules → five answers, moves, risks, gaps, discovery), `src/lib/plan.ts` (story, unlock chains, segments, plan horizons), `src/lib/lessons.ts` (lessons, guards, PLAYBOOK), `src/lib/drafts.ts`, `src/lib/copilot.ts` + `src/app/api/copilot/route.ts` (Claude Copilot), `src/components/*` (UI: Desk shell, Portfolio, Account, AccountPlan, Playbook, Discovery, ActionQueue, ChangeLog, RiskRadar, Brief, Cockpit, Copilot, McpPanel, ops outbox), `tests/engine.test.ts` (vitest, frozen fixtures in `tests/fixtures`).

## Hard rules
- **Never print, log, commit or hard-code secrets.** `.env.local` holds `AQ_TOKEN` and `COPILOT_ANTHROPIC_KEY`; it is git-ignored. Don't touch it.
- **The MCP token allows 1 call per minute in total** across every running server. Claude's dev server already runs on port 3101 with the token. **Run yours without the token** so it uses the saved snapshot and makes no MCP calls: `npm run dev:ag` (port 3001, separate build folder `.next-ag`). Never run two servers on the same build folder.
- **Never invent ids, people, numbers or facts.** Every number on screen carries citation ids that exist in `crm.sources`. Inferences must be labelled "inferred" or "hypothesis" in the UI text.
- Keep money in contract currency (A = GBP, B = EUR); never sum across accounts.
- After every task run: `npx tsc --noEmit -p .` · `npx eslint src` · `npx vitest run` (all must pass), then `git add -A && git commit -m "<task>" && git push origin main`. Append one line per finished task to `memory/04-status.md`.

## Tasks, in priority order

### T1 (P0, ~10 min): protect the public endpoints
The hosted site will be public. Anyone could spend the Anthropic credit (`/api/copilot`) or spam notes into the game (`/api/notes`).
- New `src/lib/ratelimit.ts`: an in-memory sliding window keyed by client IP (`x-forwarded-for` first value, else `x-real-ip`, else "local"). Export `limit(key: string, max: number, windowMs: number): { ok: boolean; retryAfterSec: number }`. Keep the map small (drop entries older than the window).
- `/api/copilot` (src/app/api/copilot/route.ts): max **12 requests per 10 min per IP**; question ≤ 1,000 chars; history ≤ 6 turns, each ≤ 4,000 chars. On a limit hit return `429 {error: "Too many questions. Try again in Ns."}` (the UI already shows `j.error`).
- `/api/notes`: max **8 writes per 10 min per IP**; keep the existing 1-call/min MCP guard.
- `/api/sync`: max **6 per 10 min per IP**.
- Acceptance: tsc, lint and tests pass; the 13th copilot request within 10 min returns 429; normal use is unaffected.

### T2 (P0, ~10 min): cold start shows "live" quickly and honestly
On Vercel the in-memory sync store is empty after a cold start, so the page first renders from the snapshot.
- `src/components/LiveDesk.tsx`: first poll at 500 ms instead of 2 s.
- `src/components/Desk.tsx` header: while `sync.sources.every(s => s.source !== "live")`, show a small amber chip "Showing saved data · first live pull in progress" (it disappears when any source is live).
- `src/components/McpPanel.tsx`: for sources with `source === "snapshot"`, show "saved copy (fallback)" instead of "pulled never".
- Acceptance: with no token (your `dev:ag` server) the chip stays visible; with Claude's server (3101) it disappears within ~1 minute.

### T3 (P1, ~25 min): wire the missing puzzle pieces into the engine (see `memory/09-puzzle-pieces.md`)
1. **Feature requests as sources.** In `src/lib/sync.ts` `sources()`, add `{ key: "feature_requests", tool: "get_feature_requests", args: {}, everySec: 3600, snapshot: "feature_requests.json", label: "Feature request log" }`. In `src/lib/load.ts`, read it with `getSource` and pass it as a new optional `featureRequests` field on the engine input (`RawInput` in engine.ts). In `buildCrm`, register one source per request that our accounts raised, plus FR-002 (raised by the FlytBase rollout lead during the Aldermoor rollout): id = FR id, kind "feature request", title = FR title, text = status, mentions, raised_by_your_accounts.
2. **Login insights** (`users.json` in each pack, already merged): in `src/lib/engine.ts` add rule **R-NOUSE**: a met stakeholder with `sign_ins_last_90_days === 0` → amber risk "<name> has not used the product in 90 days" (B: Stefan Roy), cite `[personId, "<A>:users.json"]`. Also add **R-IDLEOPS**: count operator logins with ≤ 3 sign-ins in 90 days → amber risk "N trained operators barely use the product", cite `<A>:users.json`.
3. **Plan additions** in `src/lib/plan.ts`:
   - A-C-RENEW: after step A-S-REN-2, add step `A-S-REN-2b` (deliver) "Board pack: monthly usage-by-force chart (FR-011, asked for by Rhys)", cite ["FR-011", "A:calls/2026-06-02_check_in.txt"].
   - Metro Central segment `give`: add "Scheduled flight-report export (FR-010) or a manual monthly export as a workaround"; cite FR-010.
   - B-C-IDLE: before B-S-IDLE-3, add step `B-S-IDLE-2b` (deliver) "Patrol schedule at every plant: push FR-002 (copy schedule across sites) with SRV, or set them up manually with the deputy", cite ["FR-002", "B:calls/2026-04-23_rollout_close.txt"].
   - B: add a new chain `B-C-INSURE` "Protect the insurance discount (hypothesis)": steps (person) "Ask group finance whether the insurer's premium depends on documented night patrols" → (proof) "Patrol log per plant for the insurer" → (money) "Keep and extend the discount". **Value: null, basis "unknown"**, why: "Named only in the morning debrief; nothing on file mentions insurance." Cite ["B:emails/2026-10-08_finance_mailbox.txt", "B:calls/2025-08-19_enquiry_call.txt"] (the contractor-guarding fact). Mark every step status "hypothesis".
   - B "Never flown / offline" segment: add a `know` line "AD-01 is most likely the Plant 11 dock (inferred: its offline pattern matches FB-10903 and it missed the 16 Sep update)"; cite ["AD-01", "B:device_events.csv", "FB-10903"].
   - B segment busy docks `build`: "Replace contractor night-guarding hours per plant (the real savings case)"; cite "B:calls/2025-08-19_enquiry_call.txt".
4. **Gaps** (engine.ts, gaps section): B gap "Is there an insurance discount tied to drone patrols, and what does it require?" → whoCanTell "Group finance / plant managers", rule "R-GAP-HIDDEN", cite ["B:emails/2026-10-08_finance_mailbox.txt"]. A gap "Which operators belong to Tarn Valley and Norwold (3 accounts at ≤3 sign-ins, 2 never)?" → "Field team attendance sheets", cite ["A:users.json", "A:calls/2026-03-24_install_check_in.txt"].
5. **Playbook** (`src/lib/lessons.ts` PLAYBOOK): add to "Week 1": "Ask each sub-unit for its document / sign-off requirements (data protection, security)", because "Tarn Valley's docks waited months for documentation (FB-10412)". Add to "Weeks 2-3": "Check operator logins at 30 days; re-train anyone under 5 sign-ins", because "Trained operators at idle sites never used the product (users.json)". Add to "Month 1-3": "Set a default patrol schedule at every site, not only where asked", because "Aldermoor scheduled patrols only at the plants that asked (FR-002)". Add a lesson in `lessonsFor` for B: **"The champion is not the user"** (Stefan 0 sign-ins vs the deputy 38) when `users.json` shows it; rule "Find and win the real operator (deputy, unit inspector) as well as the sponsor."
6. Tests (tests/engine.test.ts, fixtures already include users.json in the packs; for feature requests add `tests/fixtures/feature_requests.json` copied from `data/snapshot/feature_requests.json`): assert R-NOUSE fires for stefan_roy; B-C-INSURE exists with value null and all steps "hypothesis"; FR-011 is a source when feature requests are passed; every cite in plan, lessons, risks and gaps resolves (extend the existing "every citation" test).
- Acceptance: all checks pass; the Account plan page shows the new steps; the Playbook shows the new lesson; the Copilot can cite FR-011 (it reads `crm.sources` automatically).

### T4 (P1, ~10 min): docs for the hand-in
- `docs/thinking-doc.md` (max one page; it becomes the Google Doc): what it does and for whom; how it decides (the rules R-xx, the move score, health formula, backed/told/claim, the plan/unlock chains with live-derived status, lessons → guards); what it doesn't do yet (no dock-to-site map in the data; strategy plays are curated rules over the records; no auth; in-memory live store resets on a cold start); how AI was used (Claude Code built the engine and sync, Antigravity the UI polish and docs, a shared memory/ folder; the Copilot is Claude Opus 5.5 with every citation checked). Keep facts exactly as in the code.
- `docs/video-script.md` (3 min): 0:00 Cockpit (live) → 0:20 Portfolio → 0:40 Eastern Counties five answers → 1:20 trace £180,000 (contract.txt ÷ 35 docks → idle docks in Fleet) → 1:45 Account plan: Tarn Valley unlock chain + Print plan for Neel → 2:10 a live event arriving (Change log / MCP panel; show the "Δ" lines) → 2:30 Copilot question with cited answer → 2:50 code: sync.ts + engine.ts + tests.

### T5 (P2, only if time remains): UI polish
- Mobile width 390px: the Account plan unlock-chain cards (`w-[190px]`) should wrap without horizontal page scroll.
- The Copilot: try `output_config.effort: "low"` in `src/app/api/copilot/route.ts`; keep it only if answers stay as good (ask "What should I do first on Monday?" and check citations with `node scripts/copilot-check.mjs http://localhost:3101`, run against Claude's server, which has the keys).

## Deployment (Durvesh does this; for reference)
1. Stop all local dev servers that have the token (or they'll share the 1 call/min with Vercel).
2. Commit the latest `data/snapshot/*` (fresh fallback) and push.
3. vercel.com/new → import `durveshvpatil01/AHC-5` → Environment Variables: `AQ_TOKEN`, `COPILOT_ANTHROPIC_KEY` → Deploy.
4. Open the URL in a private window: the header shows "MCP live" within a minute; Copilot answers; Ctrl+K works.
5. Hand in on /play → Hand in: CRM URL, repo URL, Google Doc (from docs/thinking-doc.md), Drive video; both Drive files "Anyone with the link can view".
