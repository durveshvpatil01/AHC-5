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
