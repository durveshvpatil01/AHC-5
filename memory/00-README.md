# Shared memory: Account Quest CRM (FlytBase hackathon, 14 Nov 2026)

Any agent (Claude Code, Antigravity, a fresh chat) starts here. Read in order (NEW agents: start with host-info.md, 08-session-history.md and 07-antigravity-prompt.md):

0. `host-info.md`: everything the host, judges and build screen said (the rubric, the Hindi brief about plans/unlocks/lessons, scoring, the deadline of ~17:00 IST)

1. `01-brief.md`: the task, the judging and the rules (deadline: hand-in 15:47 IST + 1 h extension → **~17:00 IST, 14 Nov**)
2. `02-morning-findings.md`: what Durvesh found in the game (the data the CRM shows)
3. `03-architecture.md`: stack, data flow, the rate-limit plan and hosting
4. `04-status.md`: **who owns which files**, what's done and what's next. Update it when you finish something.
5. `05-decisions.md`: decisions already made. Don't reopen them without a reason.

Rules for every agent:
- Never put the token (AQ_TOKEN) in code, the repo, the browser bundle or the video. It lives in `.env.local` (git-ignored) and in the Vercel env vars.
- Never invent an id, a fact or a person. Every number shown cites its id from the MCP data.
- Edit only the files your lane owns (see 04-status.md). Write your progress back into 04-status.md.

More files:
- `06-crm-design.md`: the CRM structure
- `07-antigravity-prompt.md`: the **remaining development tasks** (T1-T5), with files, steps and acceptance checks
- `08-session-history.md`: the full chronological history of the Claude Code session and decisions
- `09-puzzle-pieces.md`: findings in the raw data not yet in the CRM
