# 08: Session history (Claude Code chat, 14 Nov 2026): what happened, decided and built

Read this to continue the work without the original chat. Times are IST.

## Morning (game)
- Durvesh played Account Quest (a FlytBase CSM role-play) at questathon.aihackerscollective.com. Claude first played the practice round in his Chrome (lessons: replies are shuffled; concrete-number questions open topics; vague "positive" replies close them; prepare a fix from ≤3 evidence items; pitch only after the pain is named). Durvesh then played the real game himself: Insight 28, closed $105k (2 offers won with Karen: priority support $60k, operator training $45k), 5 people met, 6 deals identified, all still "identified". See host-info.md §6.

## Build phase timeline
- ~12:54: Read the Build screen (brief, rubric, rules, MCP). Created the project `D:\flaybase-hackarthon-4\aq-crm` (Next.js 15 + Tailwind v4 + TS) and the `memory/` folder for Claude Code + Antigravity.
- ~13:10: Durvesh saved AQ_TOKEN in `.env.local`. Pulled the snapshot (REST /export, /pack/A/all, /pack/B/all, signals, schema, team, feature requests, release notes, notes) at 1 call/min into `data/snapshot/`.
- ~13:30: Read all the data and wrote the engine: model.ts (signal merge, fleet analytics, sources registry, timeline), engine.ts (five answers, rules R-USAGE/R-DROP/R-OPEN/R-THREAD/R-CHAMP/R-RENEWAL/R-CLAIM/R-COLD/R-CONN/R-BATT/R-DEADLINE/R-SIGNAL, gaps, moves with score = stake×confidence÷(days+1), health 50/25/25). Every citation verified (`scripts/engine-check.ts` → "MISSING CITES: none").
- ~14:00: UI v1 (Portfolio, Account with 5 tabs, fleet, timeline, notes, citation drawer). Fixed a nested-button hydration bug. Tested write_note: OK (note 143035).
- Repo: https://github.com/durveshvpatil01/AHC-5 (public). Antigravity did UI polish in parallel (AnswerBanner, ShowAllToggle, WeeklyChart, etc.) and drafted docs; Claude fixed two factual errors in its docs (Hannah is neutral, not guarded; stance scores are 50/75, not 55/80).
- ~14:20: Host: "the portal must have its own MCP connection; data drops at random times". Rebuilt live data as `src/lib/sync.ts`: a server-side JSON-RPC scheduler (1 call/61 s, most-overdue source first), in-memory store, call log, change diffs, snapshot fallback; `/api/crm?v=` polled every 20 s by `LiveDesk`; `/api/sync` (Sync now); MCP panel. Removed `/api/live`. Generic handling for unknown events (R-SIGNAL risk + move + Δ lines) and new accounts (stub view, pack auto-fetch). Ignore timestamp-only changes.
- 08:32 UTC: the MCP reset live events to 0 (build phase start); the portal picked it up by itself.
- ~14:45: Workspace features: sidebar shell (like the hackathon 4 console), Ctrl+K palette, shortcuts, Action queue with an outbox (Done/Snooze/Reassign/Due written as `task:<moveId>` notes via write_note, read back via list_notes; the server reserves a slot for writes), draft writer (drafts.ts), Change log, Risk radar, Monday brief (printable). Separate dev distDir (`npm run dev:claude`, port 3101, `.next-claude`) because two dev servers on one `.next` corrupted builds.
- ~15:00: AI Copilot: `/api/copilot` (Anthropic SDK 1.8, `claude-opus-5-5`, streaming, prompt-cached CRM context, fallbacks "default", effort medium), key `COPILOT_ANTHROPIC_KEY` (a stale system ANTHROPIC_API_KEY exists on this PC and must not be used). Moves/risks/gaps registered as sources. Test: 34 citations, 0 unknown.
- ~15:20: Hardening: vitest (tests/engine.test.ts on frozen fixtures in tests/fixtures), CI workflow, 15-min paperwork refresh, dev write-through of live pulls into data/snapshot (PERSIST_SNAPSHOT=1).
- ~15:40: Copilot "no answer" bug fixed (it unmounted on page switch; now kept mounted; thinking timer; 90 s timeout). Discovery page (facts by minute, claims tested, unlocks, coverage) for the host's insight-weighted second judging. Cockpit mode (full-screen live view, key x).
- ~16:10: Host's Hindi brief → proactive layer: plan.ts (story so far, unlock chains with live-derived step status, force-by-force from the flight log pulled via get_file, plan horizons 2w/quarter/12m), lessons.ts (lessons + guards + PLAYBOOK), AccountPlan page (key a, "Print plan for Neel"), Playbook page (key y, "Add a lesson"). The Copilot context includes plays and lessons. 17 tests pass.
- Live data began flowing again (account date 18 Nov; champion_leaves + urgent_request back).
- ~15:35 (clock check): realised the hand-in time is **15:47 IST (+1 h extension → ~17:00)**, not 03:47 AM. Wrote host-info.md, 09-puzzle-pieces.md and 07-antigravity-prompt.md.

## Decisions (don't reopen)
- No database: in-memory store + committed snapshot fallback (Vercel is fine; cold start falls back, then the first poll pulls live).
- Values stay in contract currency (GBP/EUR), never summed; game $ offers are labelled game$.
- Deterministic rules for numbers; the LLM is only the Copilot (cited, verified client-side).
- One process per token at a time (dev OR Vercel), else they starve each other's 1 call/min.

## Current state (commit 4116021+)
- Pages: Portfolio, Action queue, Risk radar, accounts A/B (5 answers + fleet + timeline + notes), Account plan, Playbook, Discovery, AI Copilot, Change log, Monday brief; Cockpit overlay; MCP panel; Ctrl+K.
- Dev server: http://localhost:3101 (`npm run dev:claude`). Antigravity's server may be on 3001 (default .next).
- NOT done: Vercel deploy; Thinking doc as a Google Doc; video; hand-in. See 07-antigravity-prompt.md for the remaining development tasks.
