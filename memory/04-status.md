# 04: Status and lanes (update this file as you go)

Deadline: **03:47 IST, 15 Nov 2026**. Target: deployed by 17:00, video and doc done by 21:00, links handed in early. Links can be changed until time is called.

## Lanes (to avoid two agents editing one file)
| Lane | Owner | Files |
|---|---|---|
| Data + engine + API | Claude Code | `scripts/**`, `data/**`, `src/lib/**`, `src/app/api/**`, `src/app/page.tsx` |
| UI polish | Claude Code (Antigravity may take it: tell Claude first) | `src/components/**`, `src/app/globals.css` |
| Thinking doc + video script | Antigravity | `docs/thinking-doc.md`, `docs/video-script.md` |

## Done (14 Nov ~14:15 IST)
- [x] Next.js app `aq-crm`, building clean (`npm run build`), commit `7566061`
- [x] Snapshot pulled: `data/snapshot/` (export, pack_A, pack_B, signals, schema, team, feature_requests, release_notes, notes, me)
- [x] Engine (`src/lib/engine.ts`): book / power / moves / risks / gaps for A and B; every cite resolves (`npx tsx scripts/engine-check.ts` → "MISSING CITES: none")
- [x] Live: `/api/live` fingerprint poll every 30 s → router.refresh; signal records merged into the paperwork (new usage rows change the fleet)
- [x] Write-back: `/api/notes` → POST /api/public/v1/notes (write_note). Not yet tested against the real API (it costs a call).
- [x] UI: portfolio + account pages (5 answers strip, tabs, fleet table, timeline, notes, citation drawer). No hydration errors.

## Next
- [x] Public GitHub repo: https://github.com/durveshvpatil01/AHC-5 (pushed main, commit ccbaa27)
- [ ] Vercel: import the repo, set the `AQ_TOKEN` env var, deploy, check in a private window
- [ ] Test write_note once on the deployed app
- [x] Thinking doc (Google Doc) draft ready in `docs/thinking-doc.md`
- [x] Video script (3 min) ready in `docs/video-script.md`
- [ ] Hand in the 4 links on /play → Hand in

## Key numbers (for the video and the doc)
- A: £350,000 renewal (A:contract.txt) ends 28 Feb 2027; 17/35 docks active, 7 never flew, 10 stopped; health 47. Top move: reply to Karen before the 5 Dec event (urgent_request, FB-11206).
- B: €140,000 renewal (B:contract.txt) ends 31 Jan 2027; 4/14 docks active; AD-02, AD-05 and AD-10 stopped in the last 2 weeks (usage_drop); health 33. Top move: find out why those docks stopped.

## Progress log
- Antigravity 14 Nov 13:36 IST: Polished UI across `src/components/ui.tsx`, `src/components/Desk.tsx`, `src/components/Portfolio.tsx`, `src/components/Account.tsx`, and `src/app/globals.css` (AnswerBanner on Q1–Q5 tabs, ShowAllToggle top-3 defaults, Power map with UNKNOWN red dashed seats, Fleet stacked bar + 12-week SVG chart + flagged dock pills, Risk radar red→amber sorting + overdue highlight, Live/Snapshot header pill + new-signal highlighting, 390px responsiveness + `:focus-visible`, Esc-to-close Cite drawer). Created `docs/thinking-doc.md` and `docs/video-script.md`. Verified `npm run build` (0 errors in UI files; 2 unused-var warnings in `src/lib/engine.ts`) and `http://localhost:3001` (HTTP 200). Next: Durvesh to review UI on `http://localhost:3001` and copy `docs/thinking-doc.md` / record `docs/video-script.md`.

## Notes from 14 Nov ~14:30
- write_note tested: OK, note id 143035 (account A, next_step, the Karen reply). Response shape: {id, created_at, account, kind, title, text, source}.
- **One token is shared by everything that runs it.** Local dev servers, the Vercel deploy and scripts all draw on the same 1 call/min. After deploying, stop the local servers, or the hosted CRM gets rate-limited (it then falls back to the snapshot and stays correct, just not live).
- Drafts are ready: `docs/thinking-doc.md` (paste into a Google Doc) and `docs/video-script.md`.

## 14 Nov ~15:30: the portal owns its MCP connection (host's requirement)
- The host said judges want to see **the portal's own MCP connection**, not data pulled by Claude/GPT. Fresh data will be dropped at random times (around 16:00 and later).
- `src/lib/sync.ts`: JSON-RPC tools/call scheduler, 1 call/61 s, most-overdue first (get_signals 60 s, get_my_accounts 5 min, list_notes 5 min, get_all_paperwork/account 1 h). New accounts are auto-added.
- Browser: `LiveDesk` polls `/api/crm?v=` every 20 s and swaps data in place. The header pill "MCP live" opens `McpPanel` (sources, call log, Sync now). `/api/sync` forces get_signals. `/api/live` was removed.
- Engine: an unknown live event → R-SIGNAL risk + R-MOVE-SIGNAL move + Δ before/after lines; a new account (no contract) → stub view + an R-MOVE-NEW intro move. Tested with `npx tsx scripts/sim-check.ts`.
- Only ONE process should run with the token at a time (local dev OR Vercel), or they starve each other.

## 14 Nov ~16:00: CRM workspace features (commit b41afdb+)
- At 08:32 UTC the MCP started returning 0 live events (reset for the build phase); `get_my_accounts` changed too. The portal shows this correctly; new events will arrive at random times.
- Shell (`Desk.tsx`): left rail (Portfolio, Action queue, Risk radar, accounts, Change log, Monday brief), MCP status, Ctrl+K palette (`CommandPalette.tsx`), keys p/q/r/1-9/l/b/s/m/?.
- `ops.tsx`: outbox. Done/Snooze/Reassign/Due are written as notes titled `task:<moveId>` with text `status=..; owner=..; due=..` (write_note), and read back via list_notes → `applyTaskNotes` in the engine. The server reserves the next MCP slot for a waiting write (`reserveForWrite`).
- `drafts.ts`: a draft per move (tailored + generic), with Copy, "Save draft to game" and "Mark sent + done" in a drawer.
- `ChangeLog.tsx` (sync.changes diffs + signal impacts + call log), `RiskRadar.tsx`, `Brief.tsx` (printable).
- Dev servers: Claude uses `npm run dev:claude` (port 3101, distDir .next-claude); Antigravity keeps .next. Never run two servers on one distDir.
- Not done yet: Vercel deploy (Durvesh), Thinking doc → Google Doc, video, hand-in.

## 14 Nov ~16:30: AI Copilot working
- `/api/copilot` (Claude Opus 5.5 via @anthropic-ai/sdk 1.8, streaming, prompt-cached CRM context, fallbacks "default", effort medium). Key: `COPILOT_ANTHROPIC_KEY` in .env.local (a stale system ANTHROPIC_API_KEY exists on this PC, so don't rely on that name). On Vercel, add COPILOT_ANTHROPIC_KEY too.
- Moves, risks and gaps are registered as sources (citable, open in the drawer).
- `node scripts/copilot-check.mjs [baseUrl]` asks test questions and verifies citations. The 14 Nov run had 34 citations, 0 unknown, answers in 9-24 s.

## 14 Nov ~17:00: hardening
- `npm test` (vitest, 11 tests on frozen fixtures in tests/fixtures) + CI (.github/workflows/ci.yml). Production build checked (`NEXT_DIST_DIR=.next-build npx next build`).
- Paperwork refresh is now 15 min. In dev (`npm run dev:claude`, PERSIST_SNAPSHOT=1) every live pull is written to data/snapshot: commit it before deploying so the cold-start fallback is fresh.
- npm audit: the only production finding is postcss inside next (build-time only, our own CSS); the fix needs `--force` (Next major change). Leave it.

## 14 Nov ~17:30: Copilot fix, Discovery, Cockpit (commit 52e9726)
- Copilot "no answer" bug: the component unmounted when you switched pages mid-stream, and the stored empty turn spun forever. Now it stays mounted (hidden), drops cut-off turns on load, shows a thinking timer, and has a 90 s timeout.
- Discovery page (key d): engine `discoveryOf` adds facts by minute, claims tested (contradicted/unsupported), unlocks, people and decision coverage. Built for the host's secondary judging (insight and discovery weighted above deals).
- Cockpit mode (key x / header button): full-screen live view (gauges, countdowns, moves on the clock, red risks, MCP feed).
- 13 tests pass.

## 14 Nov ~18:15: host's brief → proactive layer (commit b7957cf)
- The host asked (Hinglish, transcribed by Durvesh) for: start point (Sam's handover) → what happened → now; "if I deliver doc X what unlocks (money / person)"; per-force know/give/build (Tarn Valley: document → fly → prove → ask about stadium); a 2-week/quarter/1-year plan to present to Neel; lessons ("mistakes not to repeat") reusable for future accounts (e.g. 7 police counties); reprioritise proactively. Durvesh: don't ask about building or deployment again; he'll say when to deploy.
- Built: `src/lib/plan.ts` (story, unlock chains with live-derived status, segments from the flight log via get_file, horizons), `src/lib/lessons.ts` (lessons from history/morning/notes, guards, PLAYBOOK), pages AccountPlan (key a, printable for Neel) and Playbook (key y, "Add a lesson" → write_note "lesson: ..."). The Copilot context includes plays and lessons. 17 tests.
- Live data began arriving around 16:00 IST: account date 18 Nov, signals champion_leaves + urgent_request back; the portal picked them up by itself.
- 15:46 Claude: Notebook page (src/components/Notebook.tsx, key n) added; Desk.tsx nav line only.
- 15:44 Antigravity: T1 done — per-IP sliding-window rate limits (`src/lib/ratelimit.ts`) on `/api/copilot` (12/10m, question ≤1000 chars, history ≤6×4000), `/api/notes` (8/10m), `/api/sync` (6/10m) + unit tests (`tests/ratelimit.test.ts`).
- 15:46 Antigravity: T2 done — first `LiveDesk` poll at 500ms; "Showing saved data · first live pull in progress" header chip until a source is live; `McpPanel` labels snapshot sources as "saved copy (fallback)".
- 15:48 Antigravity: T3 done — `feature_requests` registered in `sync.ts`/`load.ts`/`engine.ts` (`FR-011`, `FR-010`, `FR-002`); login rules `R-NOUSE` and `R-IDLEOPS`; plan steps `A-S-REN-2b` (`FR-011`), `B-S-IDLE-2b` (`FR-002`), `B-C-INSURE` hypothesis chain (`value: null, basis: "unknown"`), `AD-01` Plant 11 inference, contractor guarding build; gaps `B-G-INSURE` and `A-G-OPERATORS`; Playbook additions + `B-L-USER` ("The champion is not the user"); 24/24 Vitest tests pass.
- 16:04 Antigravity: T4 done — updated `docs/thinking-doc.md` and `docs/video-script.md`; passed `tsc`, `eslint`, `vitest` (24/24), and `NEXT_DIST_DIR=.next-build npx next build`.
