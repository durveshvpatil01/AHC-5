# Account Desk — Thinking Doc

## (a) What It Does and For Whom
Account Desk is a live Monday 9:00 AM Customer Success CRM built for a FlytBase CS Manager (and their manager, Neel Sharma) managing two enterprise accounts from Account Quest: Account A (Eastern Counties Police Alliance, GBP) and Account B (Aldermoor Industrial Group, EUR). Every number, claim, risk, move, and unlock step cites its exact MCP source id—clicking any chip opens the raw contract, CSV, call transcript, ticket, or signal.

Workspace pages:
- Portfolio: Side-by-side account cards (health score, backed renewal, days left, red risks, fleet bar, "sheet says vs data says"), top moves across both accounts, and live events.
- Action queue: Ranked moves across accounts with a live write-back outbox (Done, Snooze, Reassign, Due written as `task:<moveId>` notes via `write_note` and read back via `list_notes`) plus tailored message drafts.
- Risk radar: All red and amber risks sorted by severity and "turns bad" date.
- Accounts (A & B): The five questions (1. Book, 2. Power, 3. First moves, 4. About to go wrong, 5. Unknowns) plus Fleet (12-week usage chart, per-dock sparklines, flags), searchable Timeline, and Notes write-back.
- Account plan: Handover story ("then -> morning -> now"), per-force/plant segments (know / give / build), step-by-step unlock chains, 2-week / quarter / 12-month horizons, and one-click "Print plan for Neel".
- Playbook: Lessons extracted from handover history and the morning ("mistakes not to repeat" and "what worked"), active guards on expansion moves, and a reusable onboarding checklist for the next 7 police counties.
- Notebook: Mirrors the game's notebook—deals with game stage steps, chronological journal, people met, data-room files, deadlines, and rules.
- Discovery: Morning facts by minute, claims tested against files (contradicted vs unsupported), deal unlocks, and stakeholder/decision coverage.
- AI Copilot: Streaming Claude Opus 5.5 assistant grounded on the live CRM context, where every `[cite]` is verified against `crm.sources`.
- Change log & MCP panel: Live MCP connection status, per-source pull schedule, call log, and before/after delta (`Δ`) lines when new signals arrive.
- Monday brief & Cockpit: Printable 1-page manager brief and a full-screen live operations Cockpit (`x`).

## (b) How It Decides
1. Book of Business (`backed` / `told` / `claim`):
   Values stay in native contract currency (£350,000 GBP for A; €140,000 EUR for B; `game$` for morning offers) and are never summed across currencies. Only `backed` values (proven by `contract.txt`, `invoices.json`, or `usage_weekly.csv`) count in the backed book; `told` and `claim` figures (such as Rhys's 30-dock stadium claim or Stefan's €1.2M savings claim) are quarantined apart and never totalled.

2. Health Score (`50% usage + 25% relationships + 25% support`):
   - Usage (50%): `active / total docks × 100` (docks flying >= 4 times in the last 4 weeks: 17/35 on A, 4/14 on B after `usage_drop`).
   - Relationships (25%): average stance of met stakeholders (`guarded = 25`, `neutral = 50`, `warm = 75`, `ally = 100`).
   - Support (25%): `100 - 25 × unowned open requests`.

3. Move Scoring (`score = stake × confidence ÷ (days left + 1)`):
   Ranks actions by at-risk contract/dock value × probability of unblocking ÷ urgency so hard deadlines (e.g. Karen's 5 Dec event on `FB-11206`) rise to #1 automatically.

4. Deterministic Risk & Gap Rules (`R-xx` in `src/lib/engine.ts`):
   - `R-USAGE`: >= 15% of docks flew 0 times in 4 weeks (red >= 25%); turns bad 90 days before term end (£180,000 of A's £350,000 renewal pays for 18 under-used docks).
   - `R-DROP`: Red when a busy dock (>= 3 flights/wk) stops flying for 2 weeks or drops to <= 25% of prior 4 weeks (`AD-02`, `AD-05`, `AD-10`).
   - `R-OPEN`: Open customer request with no owner (red if urgent or > 30 days old, e.g. `FB-11206`, `FB-10412`).
   - `R-THREAD` / `R-CHAMP`: Single-threaded account (red when sole signatory route Rhys Calder is leaving in January via `champion_leaves`).
   - `R-RENEWAL`: < 120 days to term end and renewal not yet qualified (red < 75 days).
   - `R-CLAIM`: Plan or story rests on an unverified `claim` fact.
   - `R-SIGNAL`: Any new/unrecognised live signal automatically creates a red/amber risk, a dated triage move, and before/after delta lines.
   - `R-NOUSE` & `R-IDLEOPS`: From `users.json`—flags met sponsors with 0 sign-ins in 90 days (`R-NOUSE`: Stefan Roy has 0 sign-ins while his unnamed deputy has 38) and operator logins with <= 3 sign-ins (`R-IDLEOPS`).
   - Additional checks: `R-COLD` (guarded stakeholder), `R-DEADLINE` (undated deadline), `R-CONN` (>= 10 connection drops), `R-BATT` (>= 5 battery warnings), and `R-GAP-*` (`FILE`, `CLAIM`, `WORTH`, `DATE`, `LINK`, `USERS`, `HIDDEN`).

5. Account Plan Unlock Chains & Playbook Guards:
   Each play is modeled as a causal chain (`deliver -> person -> usage -> proof -> money -> expansion`) whose step statuses (`done`, `open`, `at-risk`, `blocked`, `hypothesis`) recompute live from MCP records (e.g. Tarn Valley's flying step stays `blocked` while `FB-10412` is open; Aldermoor's insurance discount chain `B-C-INSURE` is strictly marked `hypothesis` with `null` value). Past mistakes become active `Guard` warnings (`L-EXPAND`: "Don't pitch yet" attached to expansion moves while > 40% of docks are idle or blockers remain open).

6. Own MCP Scheduler & Live Merge (`src/lib/sync.ts`):
   The portal maintains its own JSON-RPC `tools/call` scheduler respecting the hard 1-call/minute token limit (1 call every 61s, picking the most-overdue source first: `get_signals` 60s, `get_my_accounts` 5m, `list_notes` 5m, `get_all_paperwork` 15m, `get_file` & `get_feature_requests` 1h, reserving a slot whenever the user writes a note). Incoming signal records merge idempotently into paperwork and log before/after `Δ` diffs.

## (c) What It Does Not Do Yet
- No raw dock-to-site map exists in FlytBase's files (held by the field team / deputy); the CRM surfaces this as a Day-1 gap and marks `AD-01` -> Plant 11 as an explicit inference.
- Strategy unlock chains are curated rules over live records rather than free-form user-edited workflows.
- No multi-user authentication (protected instead by per-IP sliding-window rate limits on `/api/copilot`, `/api/notes`, and `/api/sync`).
- The in-memory live store resets on a serverless cold start, honestly displaying a "Showing saved data · first live pull in progress" chip until the first 61s MCP tick completes.

## (d) How AI Was Used
- Claude Code built the MCP sync scheduler (`src/lib/sync.ts`), data model, deterministic rules engine (`src/lib/engine.ts`), proactive plan/playbook layer (`src/lib/plan.ts`, `src/lib/lessons.ts`), and Vitest suite.
- Antigravity built UI polish, puzzle-piece rules/tests, API rate limiting (`src/lib/ratelimit.ts`), and hand-in documentation, coordinating with Claude Code through a shared `memory/` folder.
- AI Copilot runs Claude Opus 5.5 (`claude-opus-5-5`) over prompt-cached CRM state with every `[id]` citation verified client-side.
- Human (Durvesh) played the morning discovery in Account Quest, uncovered the operational ground truth, and owns the CS decisions.
